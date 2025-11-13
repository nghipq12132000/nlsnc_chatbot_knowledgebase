import os
import dotenv
import ssl
import gc
from functions.utils.common import load_proxy_config, load_model_config

from langchain_community.document_loaders import PyPDFLoader, UnstructuredWordDocumentLoader, UnstructuredPowerPointLoader, UnstructuredExcelLoader, TextLoader, UnstructuredFileLoader
from langchain_community.document_loaders import DirectoryLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings
from pydantic import SecretStr

from functions.ppt_analyzer import ppt_analyzer
from functions.xlsx_analyzer import xlsx_analyzer

# Import img_analyzer with error handling
try:
    from functions.img_analyzer import img_analyzer
    IMG_ANALYZER_AVAILABLE = True
    print("INFO: Image analyzer module loaded successfully")
except ImportError as e:
    print(f"WARNING: Image analyzer not available due to import error: {str(e)}")
    IMG_ANALYZER_AVAILABLE = False
    img_analyzer = None


class DocumentIngestor:
    def __init__(self, 
                 data_dir: str = "data/raw_data",
                 output_data_dir: str = "data/raw_data/markdown", 
                 prompt_md_path: str = "instructions/analystic",
                 persist_dir: str = "chroma_store",
                 batch_size: int = 50):
        
        # Load configurations
        self.proxy = load_proxy_config()
        self.model_config = load_model_config()
        
        # Configuration
        self.data_dir = data_dir
        self.output_data_dir = output_data_dir
        self.prompt_md_path = prompt_md_path
        self.persist_dir = persist_dir
        self.batch_size = batch_size
        
        # Prompt settings
        self.prompt_ppt_path = f"{prompt_md_path}/ppt_analyzer.md"
        self.prompt_xls_path = f"{prompt_md_path}/xlsx_analyzer.md"
        self.prompt_img_path = f"{prompt_md_path}/img_analyzer.md"
        
        self._setup_environment()
    
    def _setup_environment(self):
        """Setup proxy and SSL configuration"""
        print("INFO: Setting up environment configuration")
        
        # Set proxy environment variables if proxy is configured
        if self.proxy:
            os.environ['http_proxy'] = self.proxy 
            os.environ['HTTP_PROXY'] = self.proxy
            os.environ['https_proxy'] = self.proxy
            os.environ['HTTPS_PROXY'] = self.proxy
            print(f"INFO: Proxy configured: {self.proxy}")
        else:
            print("INFO: No proxy configuration found or proxy disabled")

        # SSL configuration
        try:
            _create_unverified_https_context = ssl._create_unverified_context
        except AttributeError:
            pass
        else:
            ssl._create_default_https_context = _create_unverified_https_context

        # Load parameters from .env file
        dotenv.load_dotenv()
        print("INFO: Environment setup completed")

    def convert_all_documents(self):
        """Convert documents using specialized analyzers"""
        print("INFO: Starting document conversion process")
        for root, dirs, files in os.walk(self.data_dir):
            for file in files:
                result = ""
                file_path = os.path.join(root, file)
                if file.startswith(("~$")):
                    continue
                
                print(f"INFO: Start analyze file: {file_path}")
                try:
                    # if file.endswith((".pptx", ".ppt")):
                    #     analyzer = ppt_analyzer.PPTAnalyzer(file_path, self.model_config['openai_api_key'], self.prompt_ppt_path)
                    #     user_vars = {}
                    #     result = analyzer.run(user_vars)
                    
                    # if file.endswith((".xlsx", ".xls", ".csv")):
                    #     analyzer = xlsx_analyzer.XLSXAnalyzer(file_path, self.model_config['openai_api_key'], self.prompt_xls_path)
                    #     user_vars = {}
                    #     result = analyzer.run(user_vars)
                    
                    if file.lower().endswith((".png", ".jpeg", ".jpg")):
                        if IMG_ANALYZER_AVAILABLE:
                            print(f"INFO: Processing image file with analyzer: {file_path}")
                            analyzer = img_analyzer.IMGAnalyzer(file_path, self.model_config['openai_api_key'], self.prompt_img_path)
                            user_vars = {"img_url": file_path}
                            result = analyzer.run(user_vars)
                            print(f"INFO: Image analysis completed for: {file_path}")
                            # Clean up analyzer to release any file handles
                            del analyzer
                            gc.collect()
                        else:
                            print(f"INFO: Skipping image file {file_path} - image analyzer not available")
                            continue
                    else:
                        print(f"INFO: File type not supported for analysis: {file_path}")
                        continue

                    # Replace backslashes and forward slashes with underscores for safe filename
                    # Remove data/raw_data prefix and replace path separators with underscores
                    safe_filename = file_path.replace(self.data_dir + os.sep, "")
                    print("safe_filename:", safe_filename)
                    output_path = f"{self.output_data_dir}/{safe_filename}.md"

                    if result != "":
                        # Ensure the output directory exists
                        output_dir = os.path.dirname(output_path)
                        if not os.path.exists(output_dir):
                            os.makedirs(output_dir, exist_ok=True)
                            print(f"INFO: Created output directory: {output_dir}")
                        
                        with open(output_path, "w", encoding="utf-8") as f:
                            f.write(result)
                        print(f"INFO: Successfully wrote analysis to: {output_path}")
                    else:
                        print(f"INFO: No analysis result generated for {file_path}")
                except Exception as e:
                    print(f"INFO: End analyze file with error: {file_path} - {str(e)}")
                    continue
                
                print(f"INFO: End analyze file: {file_path}")
        
        # Force garbage collection to release any remaining file handles
        print("INFO: Running garbage collection to release file handles")
        gc.collect()

    def get_all_documents(self):
        """Load all documents from various formats"""
        print("INFO: Starting document loading process")
        text_loader_kwargs = {'autodetect_encoding': True}

        loaders = []

        # PDF
        loaders.append(DirectoryLoader(self.data_dir, glob="**/[!~]*.pdf", loader_cls=PyPDFLoader))

        # Word
        loaders.append(DirectoryLoader(self.data_dir, glob="**/[!~]*.docx", loader_cls=UnstructuredWordDocumentLoader))

        # PowerPoint
        loaders.append(DirectoryLoader(self.data_dir, glob="**/[!~]*.pptx", loader_cls=UnstructuredPowerPointLoader))

        # Excel
        loaders.append(DirectoryLoader(self.data_dir, glob="**/[!~]*.xlsx", loader_cls=UnstructuredExcelLoader))

        # Text
        loaders.append(DirectoryLoader(self.data_dir, glob="**/[!~]*.txt", loader_cls=TextLoader, loader_kwargs=text_loader_kwargs))

        # Markdown
        loaders.append(DirectoryLoader(self.data_dir, glob="**/[!~]*.md", loader_cls=TextLoader, loader_kwargs=text_loader_kwargs))

        # Combine all documents
        documents = []
        for loader in loaders:
            try:
                docs = loader.load()
                documents.extend(docs)
                print(f"INFO: Loaded {len(docs)} documents from {loader}")
            except Exception as e:
                print(f"INFO: Error loading documents from {loader}: {str(e)}")
                
        print(f"INFO: Total documents loaded: {len(documents)}")
        return documents

    def process_documents(self):
        """Process and ingest documents into ChromaDB"""
        print("INFO: Starting document processing")
        
        # 1. Load all documents
        docs = self.get_all_documents()
        if not docs:
            print("INFO: No documents found to process")
            return
        
        # 2. Split documents
        print("INFO: Splitting documents into chunks")
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        documents = splitter.split_documents(docs)
        print(f"INFO: Split into {len(documents)} chunks")

        # 3. Create embeddings and store in Chroma
        print("INFO: Creating embeddings and storing in ChromaDB")
        embedding = OpenAIEmbeddings(
            model=self.model_config['embedding_model'],
            api_key=self.model_config.get('embedding_api_key', self.model_config['openai_api_key']),
            base_url=self.model_config.get('embedding_base_url', None) if self.model_config.get('embedding_base_url') else None
        )
        
        vectorstore = Chroma(embedding_function=embedding, persist_directory=self.persist_dir)
        
        # Process in batches
        for i in range(0, len(documents), self.batch_size):
            batch = documents[i:i+self.batch_size]
            print(f"INFO: Processing batch {i//self.batch_size + 1}/{(len(documents) + self.batch_size - 1)//self.batch_size}")
            vectorstore.add_documents(batch)

        vectorstore.persist()
        print(f"✅ Successfully embedded {len(documents)} text chunks from {len(docs)} documents into ChromaDB.")
        return len(documents), len(docs)
    
    def run(self):
        """Main method to run the ingestion process"""
        print("INFO: Starting document ingestion process")
        try:
            # Convert documents using specialized analyzers
            self.convert_all_documents()
            
            result = self.process_documents()
            print("INFO: Document ingestion completed successfully")
            return result
        except Exception as e:
            print(f"ERROR: Document ingestion failed: {str(e)}")
            raise e


# Main execution when run as script
if __name__ == "__main__":
    print("INFO: Running document ingestion as script")
    ingestor = DocumentIngestor()
    ingestor.run()