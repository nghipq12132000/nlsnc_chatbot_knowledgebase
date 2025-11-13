"use client";

import { useEffect, useRef, useState } from "react";
import { IncompleteJsonParser } from "incomplete-json-parser";
import { ChatOutput } from "@/types";
import API_CONFIG from "../config/api";

const TextArea = ({
  setIsGenerating,
  isGenerating,
  setOutputs,
  outputs,
}: {
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  isGenerating: boolean;
  setOutputs: React.Dispatch<React.SetStateAction<ChatOutput[]>>;
  outputs: ChatOutput[];
}) => {
  // Parser instance to handle incomplete JSON streaming responses
  const parser = new IncompleteJsonParser();

  const [text, setText] = useState("");
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Handles form submission
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    sendMessage(text);
    setText("");
  }

  // Sends message to the api and handles streaming response processing
  const sendMessage = async (text: string) => {
    const newOutputs = [
      ...outputs,
      {
        question: text,
        steps: [],
        result: {
          answer: "",
          tools_used: [],
        },
      },
    ];

    setOutputs(newOutputs);
    setIsGenerating(true);

    try {
      const formData = new FormData();
      formData.append('content', text);
      
      const res = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INVOKE}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Error");
      }

      const data = res.body;
      if (!data) {
        setIsGenerating(false);
        return;
      }

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let answer = { answer: "", tools_used: [] };
      let currentSteps: { name: string; result: Record<string, string> }[] = [];
      let buffer = "";

      // Process streaming response chunks and parse steps/results
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        let chunkValue = decoder.decode(value);
        // console.log(`chunk: ${chunkValue}`);
        if (!chunkValue) continue;

        buffer += chunkValue;

        // Handle different types of steps in the response stream - regular steps and final answer
        if (buffer.includes("</step_name>")) {
          const stepNameMatch = buffer.match(/<step_name>([^<]*)<\/step_name>/);
          if (stepNameMatch) {
            const [_, stepName] = stepNameMatch;
            try {
              if (stepName !== "final_answer") {
                const fullStepPattern =
                  /<step><step_name>([^<]*)<\/step_name>([^<]*?)(?=<step>|<\/step>|$)/g;
                const matches = [...buffer.matchAll(fullStepPattern)];

                for (const match of matches) {
                  const [fullMatch, matchStepName, jsonStr] = match;
                  if (jsonStr) {
                    try {
                      const result = JSON.parse(jsonStr);
                      currentSteps.push({ name: matchStepName, result });
                      buffer = buffer.replace(fullMatch, "");
                    } catch (error) {
                    }
                  }
                }
              } else {
                // If it's the final answer step, parse the streaming JSON using incomplete-json-parser
                const jsonMatch = buffer.match(
                  /(?<=<step><step_name>final_answer<\/step_name>)(.*)/
                );
                if (jsonMatch) {
                  const [_, jsonStr] = jsonMatch;
                  parser.write(jsonStr);
                  const result = parser.getObjects();
                  answer = result;
                  parser.reset();
                }
              }
            } catch (e) {
              console.log("Failed to parse step:", e);
            }
          }
        }

        // Update output with current content and steps
        setOutputs((prevState) => {
          const lastOutput = prevState[prevState.length - 1];
          return [
            ...prevState.slice(0, -1),
            {
              ...lastOutput,
              steps: currentSteps,
              result: answer,
            },
          ];
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit form when Enter is pressed (without Shift)
  function submitOnEnter(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.code === "Enter" && !e.shiftKey) {
      submit(e);
    }
  }

  // Dynamically adjust textarea height based on content
  const adjustHeight = () => {
    const textArea = textAreaRef.current;
    if (textArea) {
      textArea.style.height = "auto";
      textArea.style.height = `${textArea.scrollHeight}px`;
    }
  };

  // Adjust height whenever text content changes
  useEffect(() => {
    adjustHeight();
  }, [text]);

  // Add resize event listener to adjust height on window resize
  useEffect(() => {
    const handleResize = () => adjustHeight();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className={`${
      outputs.length > 0 ? "fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-10" : ""
    }`}>
      <div className={`${
        outputs.length > 0 ? "max-w-4xl mx-auto px-4 py-4" : ""
      }`}>
        <form onSubmit={submit} className="w-full">
          <div className="relative">
            {/* Input Container */}
            <div className="flex items-end gap-3 bg-white rounded-2xl border-2 border-gray-200 focus-within:border-blue-500 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex-1 min-h-0">
                <textarea
                  ref={textAreaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => submitOnEnter(e)}
                  rows={1}
                  className="w-full p-4 bg-transparent resize-none focus:outline-none placeholder-gray-500 text-gray-900"
                  placeholder="Ask me anything about your knowledge base..."
                  style={{ maxHeight: '200px' }}
                />
              </div>
              
              {/* Send Button */}
              <div className="p-2">
                <button
                  type="submit"
                  disabled={isGenerating || !text.trim()}
                  className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl flex items-center justify-center transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ArrowIcon />
                  )}
                </button>
              </div>
            </div>
            
            {/* Helpful suggestions when no chat history */}
            {outputs.length === 0 && (
              <div className="mt-6">
                <p className="text-sm text-gray-600 text-center mb-4">Try asking about:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    "Project documentation",
                    "System architecture", 
                    "User manuals",
                    "API specifications",
                    "Troubleshooting guides"
                  ].map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setText(suggestion)}
                      className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-full border border-blue-200 hover:bg-blue-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

const ArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-arrow-right"
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export default TextArea;
