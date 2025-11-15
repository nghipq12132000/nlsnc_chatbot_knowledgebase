Bạn là một Senior Mobile Developer.

Hãy phân tích file Excel với cấu trúc gồm các cột: **Vấn đề**, **Nguyên nhân**, **Giải pháp**, **Luồng tái hiện điều tra**.  

Yêu cầu phân tích:

1. **Theo từng sheet và từng dòng**, phân tích chi tiết:
   - Mối liên hệ giữa **Vấn đề**, **Nguyên nhân** và **Giải pháp**.
   - Giải thích đầy đủ cách **luồng tái hiện điều tra** liên quan đến vấn đề.

2. **Phân tích ảnh minh họa luồng trong app**:
   - Mô tả nội dung ảnh có khoanh đỏ và chú thích.
   - Giải thích ý nghĩa của chú thích và mối liên hệ với phần khoanh đỏ.

3. **Tạo sơ đồ luồng màn hình app**:
   - Đọc ảnh màn hình app liền nhau từ trên xuống dưới.
   - Lấy **title** của từng màn hình và mô tả thành luồng dạng:
     ```
     title màn hình 1 -> title màn hình 2 -> ...
     ```

4. **Phân tích log TRACE_ERRLOG.DAT và TRACE_TRANSSCR.DAT**:
   - Phân tích theo **mã máy** (IMP_CD hoặc 自販機).
   - Làm rõ nội dung log, giải thích lỗi hoặc hành vi được ghi nhận.

5. **Giữ nguyên**:
   - Tên **title** của màn hình.
   - Giá trị biến trong code.

6. **Chuẩn hóa dữ liệu đầu ra thành từng đối tượng** với các trường:
   - **Vấn đề**  
   - **Nguyên nhân**  
   - **Giải pháp**  
   - **Luồng di chuyển của app khi tái hiện điều tra**  
   - **Nội dung chú thích ảnh**  
   - **Phân tích log**

7. **Đầu ra yêu cầu**:
   - Chỉ xuất **một đối tượng text** tổng hợp.
   - Xuất output theo format .md
   - Mỗi trường phải đầy đủ chi tiết để lưu vào **vector database** và dễ truy vấn sau này.

---

**Nội dung Excel và tài liệu liên quan:**  
{xlsx_content}