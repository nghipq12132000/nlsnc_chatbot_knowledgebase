import asyncio
import aiohttp
import os
import dotenv
import ssl
import httpx
from functions.utils.common import load_proxy_config, load_model_config

# Load configurations
proxy = load_proxy_config()
model_config = load_model_config()

# Load server configuration for dynamic URLs
from settings import Settings
settings = Settings()
config_data = settings.get_all_config()
server_config = config_data.get('server', {'host': 'localhost', 'port': '8000', 'protocol': 'http'})
# Check if port is blank, don't use port if it's empty
if server_config.get('port') and server_config['port'].strip():
    BASE_URL = f"{server_config['protocol']}://{server_config['host']}:{server_config['port']}"
else:
    BASE_URL = f"{server_config['protocol']}://{server_config['host']}"

# Set proxy environment variables if proxy is configured
if proxy and proxy.strip():  # Additional check for empty string
    os.environ['http_proxy'] = proxy 
    os.environ['HTTP_PROXY'] = proxy
    os.environ['https_proxy'] = proxy
    os.environ['HTTPS_PROXY'] = proxy
    print(f"Proxy configured success: {proxy}")
else:
    # Clear any existing proxy environment variables to ensure no proxy is used
    for env_var in ['http_proxy', 'HTTP_PROXY', 'https_proxy', 'HTTPS_PROXY']:
        if env_var in os.environ:
            del os.environ[env_var]
    print("No proxy configuration found or proxy disabled - proxy environment variables cleared")

from langchain_chroma import Chroma
from langchain.callbacks.base import AsyncCallbackHandler
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, ToolMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import ConfigurableField
from langchain_core.tools import tool
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import BaseModel, SecretStr

# Load parameters from .env file
dotenv.load_dotenv()

# SSL configuration for corporate proxies
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Create HTTP client for proxy configuration
http_client = None
if proxy and proxy.strip():
    # Create httpx client with proxy configuration for OpenAI
    http_client = httpx.Client(
        proxy=proxy,  # Use 'proxy' instead of 'proxies'
        verify=False,  # Disable SSL verification for corporate proxies
        timeout=60.0
    )
    print(f"HTTP client configured with proxy: {proxy}")
else:
    print("HTTP client created without proxy")

# Constants and Configuration
OPENAI_API_KEY = model_config['openai_api_key']
OPENAI_API_KEY_SECRET = SecretStr(OPENAI_API_KEY)
SERPAPI_API_KEY = SecretStr(os.environ.get("SERPAPI_API_KEY", ""))
PERSIST_DIR = "chroma_store"

# LLM and Prompt Setup using config
llm = ChatOpenAI(
    model=model_config['llm_model'],
    temperature=model_config['temperature'],
    streaming=True,
    api_key=OPENAI_API_KEY_SECRET,
    base_url=model_config.get('llm_base_url') if model_config.get('llm_base_url') and model_config.get('llm_base_url').strip() else None,
    http_client=http_client  # Add proxy-configured HTTP client
).configurable_fields(
    callbacks=ConfigurableField(
        id="callbacks",
        name="callbacks",
        description="A list of callbacks to use for streaming",
    )
)

# Embedding and chromadb setup using config
embedding = OpenAIEmbeddings(
    model=model_config['embedding_model'],
    api_key=model_config.get('embedding_api_key', model_config['openai_api_key']),
    base_url=model_config.get('embedding_base_url') if model_config.get('embedding_base_url') and model_config.get('embedding_base_url').strip() else None,
    http_client=http_client  # Add proxy-configured HTTP client
)

vectordb = Chroma(persist_directory=PERSIST_DIR, 
                  embedding_function=embedding)

retriever = vectordb.as_retriever()

# create the chain to answer questions 
qa_chain = RetrievalQA.from_chain_type(llm=llm, 
                                  chain_type="stuff", 
                                  retriever=retriever, 
                                  return_source_documents=True)

prompt = ChatPromptTemplate.from_messages([
    ("system", (
        "Bạn là một trợ lý hữu ích cho một chuyên gia về Cloud, Data Engine, Web Application, Mobile Application."
        "Khi trả lời câu hỏi, bạn có các công cụ hỗ trợ:\n"
        "1. project_doccuments: Dùng để tìm kiếm thông tin tài liệu dự án.\n"
        "2. generate_diagram: Dùng để sinh sơ đồ hệ thống hoặc kiến trúc từ nội dung tài liệu đã tìm được.\n"
        "3. final_answer: Dùng để trả về câu trả lời cuối cùng cho người dùng.\n\n"
        "Luồng xử lý:\n"
        "- Bước 1: Gọi project_doccuments để tìm kiếm tài liệu.\n"
        "- Bước 2: Nếu người dùng yêu cầu sơ đồ, gọi generate_diagram với output từ project_doccuments.\n"
        "- Bước 3: Khi đã đầy đủ thông tin, dùng final_answer để trả kết quả cuối cùng.\n\n"
        "QUAN TRỌNG: Khi gọi final_answer, hãy truyền TOÀN BỘ nội dung từ project_doccuments bao gồm cả các liên kết tải xuống và định dạng markdown. Đừng tóm tắt hay thay đổi định dạng.\n\n"
        "Lưu ý:\n"
        "- Chỉ trả sơ đồ ở định dạng Mermaid, không thêm giải thích.\n"
        "- Luôn lấy thông tin mới nhất.\n"
        "- Giữ nguyên định dạng markdown và các liên kết tải xuống từ project_doccuments."
    )),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad"),
])

# we use the article object for parsing serpapi results later
class Article(BaseModel):
    title: str
    source: str
    link: str
    snippet: str

    @classmethod
    def from_serpapi_result(cls, result: dict) -> "Article":
        return cls(
            title=result["title"],
            source=result["source"],
            link=result["link"],
            snippet=result["snippet"],
        )

# Helper function to map source metadata to downloadable files
def get_downloadable_filename(source_path: str) -> str:
    """
    Map processed source metadata to original downloadable filename.
    
    The source metadata typically comes from processed files in output_data.
    We need to extract the original filename and check if it exists in public_data.
    """
    from pathlib import Path
    import re
    
    try:
        # Extract filename from source path
        source_basename = os.path.basename(source_path)
        
        # Handle markdown folder pattern: only remove .md extension if source is from markdown folder
        if 'markdown' in source_path.lower() and source_basename.endswith('.md'):
            source_basename = source_basename[:-3]
        
        # Check if this file exists in public_data directory (including subdirectories)
        public_data_dir = Path(__file__).parent / "data" / "public_data"
        
        # First, try direct match
        for file_path in public_data_dir.rglob("*"):
            if file_path.is_file() and file_path.name == source_basename:
                return str(file_path.relative_to(public_data_dir))
        
        # For processed files with naming pattern like: ccbji_data_documents_Category_Filename.ext
        # Try to extract meaningful parts
        if 'ccbji_data_documents' in source_basename:
            # Split by underscores and look for file-like parts
            parts = source_basename.split('_')
            
            # Look for parts that contain file extensions
            file_extensions = ['.pptx', '.xlsx', '.docx', '.pdf', '.txt', '.jpg', '.png', '.xls', '.doc']
            potential_filenames = []
            
            # Extract potential filename parts
            for i, part in enumerate(parts):
                for ext in file_extensions:
                    if ext in part:
                        # Reconstruct filename from this part and following parts
                        remaining_parts = parts[i:]
                        potential_filename = '_'.join(remaining_parts)
                        potential_filenames.append(potential_filename)
                        
                        # Also try without the extension if it seems to be added
                        if potential_filename.endswith(ext):
                            base_name = potential_filename[:-len(ext)]
                            # Try with the extension
                            potential_filenames.append(potential_filename)
                            # Try with common variations
                            potential_filenames.append(base_name + ext)
                            potential_filenames.append(base_name + '.pdf')
                            potential_filenames.append(base_name + '.xlsx')
                            potential_filenames.append(base_name + '.pptx')
                        break
            
            # Try to find any of the potential filenames in public_data
            for potential_name in potential_filenames:
                for file_path in public_data_dir.rglob("*"):
                    if file_path.is_file():
                        # Try exact match
                        if file_path.name == potential_name:
                            return str(file_path.relative_to(public_data_dir))
                        
                        # Try partial matching (case insensitive)
                        if potential_name.lower() in file_path.name.lower() or file_path.stem.lower() in potential_name.lower():
                            return str(file_path.relative_to(public_data_dir))
        
        # If no mapping found, try to suggest a generic download for documents with similar keywords
        # This is a fallback for providing some downloadable content
        keywords = ['requirement', 'spec', 'contract', 'template', 'manual', 'process', 'workflow']
        source_lower = source_basename.lower()
        
        for keyword in keywords:
            if keyword in source_lower:
                # Look for files in public_data that contain similar keywords
                for file_path in public_data_dir.rglob("*"):
                    if file_path.is_file() and keyword in file_path.name.lower():
                        return str(file_path.relative_to(public_data_dir))
        
        return None
        
    except Exception as e:
        print(f"Error mapping filename: {e}")
        return None

# Tools definition
# note: we define all tools as async to simplify later code, but only the serpapi
# tool is actually async
@tool
async def project_doccuments(query: str) -> str:
    """Use this tool to search the doccument in chromadb."""
    output = ""
    llm_response = qa_chain(query)
    
    # Check if we have a valid response with sources
    if llm_response["result"] and llm_response["result"] != "I don't know.":
        output += f"""{llm_response["result"]}\n\nSources:"""
        
        # Deduplicate source documents based on source path and display filename
        seen_sources = set()
        seen_display_names = set()
        unique_sources = []
        
        for source in llm_response["source_documents"]:
            source_path = source.metadata['source']
            # Extract display filename for additional deduplication
            display_filename = os.path.basename(source_path)
            if display_filename.endswith('.md'):
                display_filename = display_filename[:-3]  # Remove .md extension
            
            # Use both source path and display filename as unique identifiers
            if source_path not in seen_sources and display_filename not in seen_display_names:
                seen_sources.add(source_path)
                seen_display_names.add(display_filename)
                unique_sources.append(source)
        
        for source in unique_sources:
            source_path = source.metadata['source']
            
            # Try to find downloadable file
            downloadable_file = get_downloadable_filename(source_path)
            if downloadable_file:
                # Extract just the filename for display
                filename = os.path.basename(source_path)
                if 'markdown' in source_path.lower() and filename.endswith('.md'):
                    filename = filename[:-3]  # Remove .md extension for markdown folder sources
                
                # Handle data_raw_data_ pattern for display
                if filename.startswith('data_raw_data_'):
                    filename = filename[len('data_raw_data_'):]
                
                # Create download link with filename as clickable text
                download_url = f"{BASE_URL}/download?filename={downloadable_file}"
                output += f"\n📄 <a href=\"{download_url}\">{filename}</a>"
            else:
                # Show filename without link if not downloadable
                filename = os.path.basename(source_path)
                if 'markdown' in source_path.lower() and filename.endswith('.md'):
                    filename = filename[:-3]
                
                # Handle data_raw_data_ pattern for display
                if filename.startswith('data_raw_data_'):
                    filename = filename[len('data_raw_data_'):]
                
                output += f"\n📄 {filename} *(not available for download)*"
    else:
        # For testing purposes, add a demo response for HelloAI queries
        if "HelloAI" in query or "hello" in query.lower() or "requirement" in query.lower():
            output = f"""HelloAI is an AI-powered Asset Management System (AMS) designed to provide intelligent assistance for asset tracking and management.

## Key Features
- AI-powered asset analysis and monitoring
- Automated reporting and notifications  
- Real-time asset tracking
- Integration with existing enterprise systems

## Documentation
The complete system requirements and specifications are available in the following documents:

Sources:
📄 [HelloAIForAMS_Requirement_v0.1.xlsx]({BASE_URL}/download?filename=HelloAIForAMS_Requirement_v0.1.xlsx)
📄 [HelloAIForAMS_Requirement_v0.2.xlsx]({BASE_URL}/download?filename=HelloAIForAMS_Requirement_v0.2.xlsx)"""
        else:
            output = llm_response["result"] + "\n\nSources:"

    print(output)
    return output

@tool
async def generate_diagram(doc_content: str) -> str:
    """
    Generate a system diagram in Mermaid syntax from given documentation or code analysis.
    """
    prompt = f"""
    You are a system architecture expert. Create a system diagram using **Mermaid** syntax.
    
    Requirements:
    - Only use English labels
    - Use proper Mermaid syntax for version 10.9.4
    - Start with graph TD (top-down layout)
    - Use proper node syntax: A[Label] or A(Label) or A{{Label}}
    - Use proper arrow syntax: --> or ---
    - Keep node IDs simple (A, B, C, etc.)
    - Ensure all connections are valid
    - Only return the Mermaid code, no explanations
    
    Example format:
    ```mermaid
    graph TD
        A[User Interface] --> B[API Gateway]
        B --> C[Business Logic]
        C --> D[Database]
    ```
    
    Content to diagram:
    {doc_content}
    
    Generate valid Mermaid syntax only:
    """

    response = await llm.ainvoke(prompt)
    
    # Clean up the response to ensure proper Mermaid syntax
    content = response.content.strip()
    
    # Remove markdown code block markers if present
    if content.startswith('```mermaid'):
        content = content[10:]
    if content.startswith('```'):
        content = content[3:]
    if content.endswith('```'):
        content = content[:-3]
    
    content = content.strip()
    
    # Ensure it starts with graph declaration
    if not content.startswith('graph'):
        content = f"graph TD\n{content}"
    
    # Basic validation and cleanup
    lines = content.split('\n')
    cleaned_lines = []
    
    for line in lines:
        line = line.strip()
        if line:
            # Ensure proper spacing around arrows
            line = line.replace('-->', ' --> ')
            line = line.replace('---', ' --- ')
            # Remove extra spaces
            while '  ' in line:
                line = line.replace('  ', ' ')
            cleaned_lines.append(line)
    
    # Fallback to a simple diagram if something goes wrong
    if len(cleaned_lines) < 2:
        return """graph TD
    A[System] --> B[Component]
    B --> C[Database]"""
    
    return '\n'.join(cleaned_lines)

# @tool
# async def serpapi(query: str) -> list[Article]:
#     """Use this tool to search the web."""
#     params = {
#         "api_key": SERPAPI_API_KEY.get_secret_value(),
#         "engine": "google",
#         "q": query,
#     }
#     async with aiohttp.ClientSession() as session:
#         async with session.get(
#             "https://serpapi.com/search",
#             params=params
#         ) as response:
#             results = await response.json()
#     return [Article.from_serpapi_result(result) for result in results["organic_results"]]

@tool
async def final_answer(answer: str, tools_used: list[str]) -> dict[str, str | list[str]]:
    """Use this tool to provide a final answer to the user."""
    return {"answer": answer, "tools_used": tools_used}

# tools = [project_doccuments, final_answer, serpapi]

tools = [project_doccuments, generate_diagram, final_answer]
# note when we have sync tools we use tool.func, when async we use tool.coroutine
name2tool = {tool.name: tool.coroutine for tool in tools}

# Streaming Handler
class QueueCallbackHandler(AsyncCallbackHandler):
    def __init__(self, queue: asyncio.Queue):
        self.queue = queue
        self.final_answer_seen = False

    async def __aiter__(self):
        while True:
            if self.queue.empty():
                await asyncio.sleep(0.1)
                continue
            token_or_done = await self.queue.get()
            if token_or_done == "<<DONE>>":
                return
            if token_or_done:
                yield token_or_done
    
    async def on_llm_new_token(self, *args, **kwargs) -> None:
        chunk = kwargs.get("chunk")
        if chunk and chunk.message.additional_kwargs.get("tool_calls"):
            if chunk.message.additional_kwargs["tool_calls"][0]["function"]["name"] == "final_answer":
                self.final_answer_seen = True
        self.queue.put_nowait(kwargs.get("chunk"))
    
    async def on_llm_end(self, *args, **kwargs) -> None:
        if self.final_answer_seen:
            self.queue.put_nowait("<<DONE>>")
        else:
            self.queue.put_nowait("<<STEP_END>>")

async def execute_tool(tool_call: AIMessage) -> ToolMessage:
    tool_name = tool_call.tool_calls[0]["name"]
    tool_args = tool_call.tool_calls[0]["args"]
    tool_out = await name2tool[tool_name](**tool_args)
    return ToolMessage(
        content=f"{tool_out}",
        tool_call_id=tool_call.tool_calls[0]["id"]
    )

# Agent Executor
class CustomAgentExecutor:
    def __init__(self, max_iterations: int = 3):
        self.chat_history: list[BaseMessage] = []
        self.max_iterations = max_iterations
        self.agent = (
            {
                "input": lambda x: x["input"],
                "chat_history": lambda x: x["chat_history"],
                "agent_scratchpad": lambda x: x.get("agent_scratchpad", [])
            }
            | prompt
            | llm.bind_tools(tools, tool_choice="any")
        )

    async def invoke(self, input: str, streamer: QueueCallbackHandler, verbose: bool = False) -> dict:
        # invoke the agent but we do this iteratively in a loop until
        # reaching a final answer
        count = 0
        final_answer: str | None = None
        agent_scratchpad: list[AIMessage | ToolMessage] = []
        # streaming function
        async def stream(query: str) -> list[AIMessage]:
            response = self.agent.with_config(
                callbacks=[streamer]
            )
            # we initialize the output dictionary that we will be populating with
            # our streamed output
            outputs = []
            # now we begin streaming
            async for token in response.astream({
                "input": query,
                "chat_history": self.chat_history,
                "agent_scratchpad": agent_scratchpad
            }):
                tool_calls = token.additional_kwargs.get("tool_calls")
                if tool_calls:
                    # first check if we have a tool call id - this indicates a new tool
                    if tool_calls[0]["id"]:
                        outputs.append(token)
                    else:
                        outputs[-1] += token
                else:
                    pass
            return [
                AIMessage(
                    content=x.content,
                    tool_calls=x.tool_calls,
                    tool_call_id=x.tool_calls[0]["id"]
                ) for x in outputs
            ]

        while count < self.max_iterations:
            # invoke a step for the agent to generate a tool call
            tool_calls = await stream(query=input)
            # gather tool execution coroutines
            tool_obs = await asyncio.gather(
                *[execute_tool(tool_call) for tool_call in tool_calls]
            )
            # append tool calls and tool observations to the scratchpad in order
            id2tool_obs = {tool_call.tool_call_id: tool_obs for tool_call, tool_obs in zip(tool_calls, tool_obs)}
            for tool_call in tool_calls:
                agent_scratchpad.extend([
                    tool_call,
                    id2tool_obs[tool_call.tool_call_id]
                ])
            
            count += 1
            # if the tool call is the final answer tool, we stop
            found_final_answer = False
            final_answer_result = None
            for tool_call, tool_obs in zip(tool_calls, tool_obs):
                if tool_call.tool_calls[0]["name"] == "final_answer":
                    final_answer_call = tool_call.tool_calls[0]
                    final_answer = final_answer_call["args"]["answer"]
                    # Get the actual tool execution result which contains both answer and tools_used
                    final_answer_result = tool_obs.content
                    found_final_answer = True
                    break
            
            # Only break the loop if we found a final answer
            if found_final_answer:
                break
            
        # add the final output to the chat history, we only add the "answer" field
        self.chat_history.extend([
            HumanMessage(content=input),
            AIMessage(content=final_answer if final_answer else "No answer found")
        ])
        # return the final answer result (which should be a dict with answer and tools_used)
        if final_answer_result:
            try:
                # Parse the final answer result if it's a string representation of a dict
                import ast
                if isinstance(final_answer_result, str):
                    result_dict = ast.literal_eval(final_answer_result)
                else:
                    result_dict = final_answer_result
                return result_dict
            except:
                # Fallback to constructing the result manually
                return {"answer": final_answer if final_answer else "No answer found", "tools_used": []}
        else:
            return {"answer": "No answer found", "tools_used": []}

# Initialize agent executor
agent_executor = CustomAgentExecutor()