# xlsx_convert.py
import os
import dotenv
import ssl
import re

from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import UnstructuredExcelLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

class XLSXAnalyzer:
    def __init__(self, input_path: str, openai_api_key: str, prompt_md_path: str, model_name: str = "gpt-4.1"):
        """
        Class để load và phân tích nội dung Excel dưới góc nhìn Data Engineer
        :param xlsx_path: Đường dẫn file PowerPoint
        :param openai_api_key: API key của OpenAI
        :param model_name: Tên model OpenAI muốn dùng
        """
        self.input_path = input_path
        self.openai_api_key = openai_api_key
        self.prompt_md_path = prompt_md_path
        os.environ["OPENAI_API_KEY"] = openai_api_key

        self.llm = ChatOpenAI(model=model_name, temperature=0.3, request_timeout=300)

    def load_prompt_from_md(self):
        """Đọc prompt từ file markdown"""
        if not os.path.exists(self.prompt_md_path):
            raise FileNotFoundError(f"Không tìm thấy file prompt: {self.prompt_md_path}")

        with open(self.prompt_md_path, "r", encoding="utf-8") as f:
            return f.read()
        
    def load_xlsx_content(self):
        """Load nội dung từ Excel"""
        loader = UnstructuredExcelLoader(self.input_path)
        docs = loader.load()
        return "\n\n".join([doc.page_content for doc in docs])
    
    def get_placeholders(self, prompt_text: str):
        """Tìm tất cả placeholder dạng {var_name}"""
        return list(set(re.findall(r"\{(.*?)\}", prompt_text)))

    def analyze_chunk(self, variables, prompt_text):
        if variables is None:
            variables = {}

        placeholders = self.get_placeholders(prompt_text)

        for ph in placeholders:
            if "xlsx" in ph.lower() and ph not in variables:
                variables[ph] = variables

        # Fill rỗng cho các placeholder còn thiếu
        for ph in placeholders:
            if ph not in variables:
                variables[ph] = ""

        #input_vars = [k for k in variables.keys() if ("{" + k + "}" in prompt_text)]
        """Phân tích 1 chunk"""
        prompt = PromptTemplate.from_template(prompt_text)
        chain = LLMChain(llm=self.llm, prompt=prompt)

        return chain.run(**variables)

    def run(self, variables):
        xlsx_text = self.load_xlsx_content()

        # Chia nhỏ nội dung XLSX
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = splitter.split_text(xlsx_text)
        print(f"📄 Số chunk cần phân tích: {len(chunks)}")

        prompt_text = self.load_prompt_from_md()
        results = []

        for i, chunk in enumerate(chunks, start=1):
            print(f"🔍 Đang phân tích chunk {i}/{len(chunks)}...")
            chunk_vars = variables.copy()
            chunk_vars["xlsx_content"] = chunk
            result = self.analyze_chunk(chunk_vars, prompt_text)
            results.append(f"## Kết quả phân tích chunk {i}\n{result}\n")

        # Ghép kết quả thành báo cáo cuối
        final_report = "\n\n".join(results)
        return final_report


# Nếu chạy trực tiếp file này thì sẽ thực thi ví dụ
if __name__ == "__main__":
    proxy = 'http://nghipq:A3pt8BVUnf5^@fsoft-proxy:8080'

    os.environ['http_proxy'] = proxy 
    os.environ['HTTP_PROXY'] = proxy
    os.environ['https_proxy'] = proxy
    os.environ['HTTPS_PROXY'] = proxy

    try:
        _create_unverified_https_context = ssl._create_unverified_context
    except AttributeError:
        pass
    else:
        ssl._create_default_https_context = _create_unverified_https_context

    # Load parameters from .env file
    dotenv.load_dotenv()
    
    INPUT_DIR = "data"

    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    FILE_NAME = "sample.xlsx"
    PROMPT_MD_PATH = "xlsx_analyzer.md"

    INPUT_PATH = f"{INPUT_DIR}/{FILE_NAME}"

    if not OPENAI_API_KEY:
        raise ValueError("Vui lòng set biến môi trường OPENAI_API_KEY")

    analyzer = XLSXAnalyzer(INPUT_PATH, OPENAI_API_KEY, PROMPT_MD_PATH)
    # Truyền dict biến (có thể bỏ qua xlsx_text, hệ thống sẽ tự thêm)
    user_vars = {
        "mục_tiêu_phân_tích": "Phân tích kiến trúc giải pháp",
        "cloud_preference": "AWS"
    }

    result = analyzer.run(user_vars)

    OUTPUT_PATH = "output/analysis_output.md"

    # Write kết quả vào file ngay tại main
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(result)

    print(f"✅ Kết quả đã được lưu tại: {OUTPUT_PATH}")