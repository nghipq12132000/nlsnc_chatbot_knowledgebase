# xlsx_convert.py
import os
import dotenv
import ssl
import re

from langchain_openai import ChatOpenAI
try:
    from transformers import BlipProcessor, BlipForConditionalGeneration
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("WARNING: transformers not available, using fallback image analysis")
from PIL import Image
# from langchain_community.document_loaders import UnstructuredExcelLoader
# from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain

class IMGAnalyzer:
    def __init__(self, input_path: str, openai_api_key: str, prompt_md_path: str, model_name: str = "gpt-4.1"):
        """
        Class để load và phân tích nội dung Image dưới góc nhìn Data Engineer
        :param img_path: Đường dẫn file PowerPoint
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
        
    def get_image_caption(self, img_url):
        """tạo image caption từ {img_url}"""
        try:
            print(f"DEBUG: Opening image file: {img_url}")
            image = Image.open(img_url)
            print(f"DEBUG: Image opened successfully, size: {image.size}")
            
            if TRANSFORMERS_AVAILABLE:
                print("DEBUG: Using transformers for image captioning...")
                # Use transformers for detailed captioning
                processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
                model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
                inputs = processor(image, return_tensors="pt")
                out = model.generate(**inputs)
                caption = processor.decode(out[0], skip_special_tokens=True)
                print(f"DEBUG: Transformers caption generated: {caption}")
                return caption
            else:
                print("DEBUG: Using fallback image analysis...")
                # Fallback: Use basic image properties
                width, height = image.size
                mode = image.mode
                format_name = image.format or "Unknown"
                
                # Create a basic description
                caption = f"Image file: {os.path.basename(img_url)}, Format: {format_name}, Size: {width}x{height} pixels, Mode: {mode}"
                print(f"DEBUG: Fallback caption generated: {caption}")
                return caption
                
        except Exception as e:
            print(f"ERROR: Failed to generate image caption: {str(e)}")
            return f"Error processing image: {str(e)}"
        finally:
            # Ensure the image file is properly closed
            if 'image' in locals():
                image.close()

    
    def get_placeholders(self, prompt_text: str):
        """Tìm tất cả placeholder dạng {var_name}"""
        return list(set(re.findall(r"\{(.*?)\}", prompt_text)))

    def analyze(self, variables, prompt_text):
        if variables is None:
            variables = {}

        #input_vars = [k for k in variables.keys() if ("{" + k + "}" in prompt_text)]
        """Phân tích image"""
        try:
            print(f"DEBUG: Starting image analysis for {variables.get('img_url', 'unknown')}")
            prompt = PromptTemplate.from_template(prompt_text)
            chain = LLMChain(llm=self.llm, prompt=prompt)
            
            # Get image caption
            print("DEBUG: Getting image caption...")
            caption = self.get_image_caption(variables["img_url"])
            print(f"DEBUG: Generated caption: {caption}")
            variables["caption"] = caption

            print("DEBUG: Running LLM chain with prompt...")
            result = chain.run(**variables)
            print(f"DEBUG: LLM result length: {len(result) if result else 0}")
            return result
        except Exception as e:
            print(f"ERROR: Analysis failed: {str(e)}")
            return ""

    def run(self, variables):
        try:
            print("DEBUG: Loading prompt from markdown file...")
            prompt_text = self.load_prompt_from_md()
            print(f"DEBUG: Prompt loaded, length: {len(prompt_text)}")
            
            print("DEBUG: Starting analysis...")
            final_report = self.analyze(variables, prompt_text)
            print(f"DEBUG: Final report length: {len(final_report) if final_report else 0}")
            
            return final_report
        except Exception as e:
            print(f"ERROR: Run method failed: {str(e)}")
            return ""


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
    FILE_NAME = "sample.png"
    PROMPT_MD_PATH = "img_analyzer.md"

    INPUT_PATH = f"{INPUT_DIR}/{FILE_NAME}"

    if not OPENAI_API_KEY:
        raise ValueError("Vui lòng set biến môi trường OPENAI_API_KEY")

    analyzer = IMGAnalyzer(INPUT_PATH, OPENAI_API_KEY, PROMPT_MD_PATH)
    # Truyền dict biến (có thể bỏ qua img_text, hệ thống sẽ tự thêm)
    user_vars = {
        "img_url": INPUT_PATH
    }

    result = analyzer.run(user_vars)

    OUTPUT_PATH = "output/analysis_output.md"

    # Write kết quả vào file ngay tại main
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(result)

    print(f"✅ Kết quả đã được lưu tại: {OUTPUT_PATH}")