import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Step, type ChatOutput } from "@/types";
import { useEffect, useState } from "react";
import { UserIcon, CpuChipIcon } from '@heroicons/react/24/outline';

const Output = ({ output }: { output: ChatOutput }) => {
  const detailsHidden = !!output.result?.answer;
  return (
    <div className="space-y-6">
      <div className="border-t border-gray-100 py-8 first-of-type:pt-0 first-of-type:border-t-0">
        {/* User Question */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-gray-600" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-50 rounded-2xl px-4 py-3 inline-block max-w-3xl">
              <p className="text-gray-900 font-medium">{output.question}</p>
            </div>
          </div>
        </div>

        {/* AI Response */}
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
            <CpuChipIcon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            {/* Steps */}
            {output.steps.length > 0 && (
              <GenerationSteps steps={output.steps} done={detailsHidden} />
            )}

            {/* Answer */}
            {output.result?.answer && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <div
                  className="prose dark:prose-invert max-w-none prose-pre:whitespace-pre-wrap prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900"
                  style={{
                    overflowWrap: "anywhere",
                  }}
                >
                  <MarkdownRenderer content={output.result.answer} />
                </div>
              </div>
            )}

            {/* Tools Used */}
            {output.result?.tools_used?.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Tools used:</span>
                <div className="flex flex-wrap gap-1">
                  {output.result.tools_used.map((tool, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

  );
};

const GenerationSteps = ({ steps, done }: { steps: Step[]; done: boolean }) => {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (done) setHidden(true);
  }, [done]);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl mb-4 overflow-hidden">
      <button
        className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-blue-100 transition-colors"
        onClick={() => setHidden(!hidden)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full transition-colors ${
            !done ? "animate-pulse bg-blue-500" : "bg-green-500"
          }`}></div>
          <span className="text-sm font-medium text-blue-900">
            Processing Steps ({steps.length})
          </span>
        </div>
        {hidden ? <ChevronDown /> : <ChevronUp />}
      </button>

      {!hidden && (
        <div className="px-4 pb-4">
          <div className="space-y-3">
            {steps.map((step, j) => {
              return (
                <div key={j} className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 mb-1">{step.name}</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(step.result).map(([key, value]) => {
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white text-blue-700 border border-blue-200"
                          >
                            {key}: {value}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ChevronDown = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-chevron-down"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const ChevronUp = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-chevron-up"
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

export default Output;
