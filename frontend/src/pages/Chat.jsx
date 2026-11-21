import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  FileText,
  Loader2,
  ChevronDown,
  Info,
} from "lucide-react";
import Button from "../components/common/Button";
import Card from "../components/common/Card";
import { chatService } from "../services/chatService";
import { documentService } from "../services/documentService";
import useDocumentTitle from "../hooks/useDocumentTitle";

export default function Chat() {
  useDocumentTitle("AI Tutor", "Chat with your 24/7 AI Tutor powered by RAG and course materials.");
  const [searchParams] = useSearchParams();
  const initialDocId = searchParams.get("doc") || "all";

  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [selectedDocId, setSelectedDocId] = useState(initialDocId);
  const [documents, setDocuments] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    "What is deadlock in Operating Systems?",
    "Explain normalization and normal forms in DBMS",
    "What are the 4 ACID properties of database transactions?",
    "Explain paging and virtual memory in simple terms",
    "What is the difference between TCP and UDP?",
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const [sessions, docs] = await Promise.all([
          chatService.getSessions(),
          documentService.getDocuments(),
        ]);
        setDocuments(docs);

        let session = sessions[0];
        if (!session) {
          session = await chatService.createSession(
            "General Study Session",
            initialDocId === "all" ? null : initialDocId
          );
        }
        setCurrentSession(session);

        const msgs = await chatService.getSessionMessages(session.sessionId);
        setMessages(msgs);
      } catch (err) {
        console.error("Failed to initialize chat session", err);
      }
    };
    initChat();
  }, [initialDocId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (messageText = null) => {
    const text = messageText || inputValue;
    if (!text.trim() || isTyping) return;

    let activeSession = currentSession;
    if (!activeSession) {
      try {
        activeSession = await chatService.createSession(
          "Study Session",
          selectedDocId === "all" ? null : selectedDocId
        );
        setCurrentSession(activeSession);
      } catch (err) {
        console.error("Failed to create session", err);
        return;
      }
    }

    const optimisticUserMsg = {
      messageId: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInputValue("");
    setIsTyping(true);

    try {
      const docFilter = selectedDocId === "all" ? null : selectedDocId;
      const result = await chatService.sendMessage(
        activeSession.sessionId,
        text.trim(),
        docFilter
      );

      if (result.assistantMessage) {
        setMessages((prev) => [
          ...prev.filter((m) => m.messageId !== optimisticUserMsg.messageId),
          result.userMessage,
          {
            ...result.assistantMessage,
            sources: result.sources || result.assistantMessage.sources || [],
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          messageId: `err-${Date.now()}`,
          role: "assistant",
          content:
            "Sorry, I had trouble retrieving document chunks or reaching the AI engine. Please verify that your document has finished processing.",
          sources: [],
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetSession = async () => {
    setIsTyping(false);
    try {
      const newSession = await chatService.createSession(
        "New Study Session",
        selectedDocId === "all" ? null : selectedDocId
      );
      setCurrentSession(newSession);
      const msgs = await chatService.getSessionMessages(newSession.sessionId);
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to reset session", err);
    }
  };

  const selectedDocObj = documents.find(
    (d) => d.id === selectedDocId || d.documentId === selectedDocId
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-w-5xl mx-auto space-y-4">
      {/* Top Bar: Document Selector & Session Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-tight">
              StudyMate AI Tutor
            </h3>
            <p className="text-[11px] text-slate-500">
              Active Context:{" "}
              <span className="font-semibold text-indigo-600">
                {selectedDocId === "all"
                  ? "All Uploaded Notes"
                  : selectedDocObj?.name || selectedDocObj?.fileName || "Selected Document"}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Document Context Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium hidden sm:inline">
              Target Document:
            </span>
            <select
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-600 max-w-[220px] truncate"
            >
              <option value="all">📚 All Uploaded Documents</option>
              {documents.map((doc) => (
                <option
                  key={doc.id || doc.documentId}
                  value={doc.id || doc.documentId}
                >
                  📄 {doc.name || doc.fileName}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetSession}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl text-xs flex items-center gap-1 transition-colors"
            title="Start New Chat Session"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">New Session</span>
          </button>
        </div>
      </div>

      {/* Suggested Questions Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Prompts:
        </span>
        {suggestedQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="whitespace-nowrap text-xs bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-700 font-medium px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs transition-all active:scale-95"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Scrollable Area */}
      <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4 sm:p-6 overflow-y-auto space-y-5">
        {messages.length === 0 && !isTyping && (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
              <Bot className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              Welcome to StudyMate AI Tutor
            </h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Ask questions about your uploaded PDF notes, request derivations, or explore key concepts. Click any suggested prompt above to begin!
            </p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isUser = msg.role === "user";
          const formattedTime = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          return (
            <div
              key={msg.messageId || msg.id || index}
              className={`flex items-start gap-3 sm:gap-4 ${
                isUser ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? "bg-slate-800 text-white"
                    : "bg-gradient-to-tr from-indigo-600 to-violet-600 text-white"
                }`}
              >
                {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 text-sm ${
                  isUser
                    ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10"
                    : "bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between gap-4 mb-2 pb-1.5 border-b border-white/10">
                  <span
                    className={`text-xs font-bold ${
                      isUser ? "text-indigo-100" : "text-slate-900"
                    }`}
                  >
                    {isUser ? "You" : "StudyMate AI Tutor"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] ${
                        isUser ? "text-indigo-200" : "text-slate-400"
                      }`}
                    >
                      {formattedTime}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() =>
                          copyToClipboard(msg.messageId || index, msg.content)
                        }
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                        title="Copy message"
                      >
                        {copiedId === (msg.messageId || index) ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                </div>

                {/* Section 10: Grounded Sources Display */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Sources Cited:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((src, sIdx) => (
                        <div
                          key={sIdx}
                          className="group relative inline-flex items-center gap-1.5 bg-white border border-slate-200/90 text-slate-700 px-2.5 py-1 rounded-lg text-xs shadow-2xs hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-help"
                          title={src.snippet || "Referenced textbook passage"}
                        >
                          <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800">
                            {src.fileName || "Document"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">
                            Page {src.pageNumber || 1}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-indigo-600 font-medium">
                            Section {src.chunkIndex + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-slate-50 rounded-2xl rounded-tl-none p-4 border border-slate-100 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
              <div
                className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <div
                className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
              <span className="text-xs text-slate-500 font-medium ml-1">
                Searching vector index & generating grounded tutor response...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Area */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-2.5 sm:p-3 shrink-0 flex items-center gap-3">
        <textarea
          ref={textareaRef}
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about your course materials (e.g., 'What is deadlock?' or 'Explain normalization')..."
          className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 max-h-32"
        />

        <Button
          variant="primary"
          size="md"
          icon={Send}
          onClick={() => handleSend()}
          disabled={!inputValue.trim() || isTyping}
          className="rounded-xl px-4 py-2.5"
        >
          Send
        </Button>
      </div>
    </div>
  );
}