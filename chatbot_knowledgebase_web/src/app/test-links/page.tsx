import MarkdownRenderer from '../../components/MarkdownRenderer';

export default function TestLinks() {
  const testContent = `
# Test HTML Links in Markdown

## Test Case 1: HTML Anchor Tags (current agent output)
📄 <a href="http://localhost:8000/download?filename=HelloAIForAMS_Requirement_v0.1.xlsx">HelloAIForAMS_Requirement_v0.1.xlsx</a>

📄 <a href="http://localhost:8000/download?filename=Template/フォーマット/61-01.xlsx">Template File Example</a>

## Test Case 2: Markdown Links (alternative format)
📄 [HelloAIForAMS_Requirement_v0.1.xlsx](http://localhost:8000/download?filename=HelloAIForAMS_Requirement_v0.1.xlsx)

📄 [Template File Example](http://localhost:8000/download?filename=Template/フォーマット/61-01.xlsx)

## Expected Behavior
- Both HTML anchor tags and Markdown links should render as clickable download links
- They should have file icons and proper styling
- They should trigger file downloads when clicked
- The DownloadLink component should detect download URLs and apply special styling

## Regular Links (should not get download styling)
Here's a [regular link](https://www.google.com) that should not get download styling.
`;

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          HTML Link Rendering Test
        </h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer content={testContent} />
        </div>
        
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded border">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>Both HTML anchor tags and Markdown links should render identically</li>
            <li>Download links should have file icons and blue styling</li>
            <li>Regular links should have standard link styling without file icons</li>
            <li>Clicking download links should trigger file downloads (if backend is running)</li>
          </ol>
        </div>
      </div>
    </div>
  );
}