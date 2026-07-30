import React, { useState } from 'react';
import { 
  ListOrdered, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Terminal, 
  Play, 
  Bot,
  Sparkles,
  Globe,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { AITask } from '../types';
import { retryWorkflowStep } from '../services/api';

interface TaskQueueViewProps {
  tasks: AITask[];
  onTasksUpdated: () => void;
}

export const TaskQueueView: React.FC<TaskQueueViewProps> = ({
  tasks,
  onTasksUpdated,
}) => {
  const [activeTaskLog, setActiveTaskLog] = useState<AITask | null>(tasks[0] || null);
  const [retryingStep, setRetryingStep] = useState<string | null>(null);

  const handleStepRetry = async (taskId: string, step: 'chatgpt' | 'gemini' | 'woocommerce') => {
    setRetryingStep(`${taskId}-${step}`);
    try {
      await retryWorkflowStep(taskId, step);
      onTasksUpdated();
      alert(`步骤 [${step.toUpperCase()}] 已成功重新触发并执行完毕！`);
    } catch (err: any) {
      alert('步骤重试失败: ' + (err.message || '网络连接超时'));
    } finally {
      setRetryingStep(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-xs mb-1">
            <ListOrdered className="w-4 h-4" />
            <span>AI WORKFLOW PIPELINE MONITOR</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI 流水线任务监控与重试控制台</h2>
          <p className="text-xs text-slate-400 mt-1">
            实时监控商品 Task 的四个核心阶段状态、底层运行日志，支持步骤级故障一键恢复。
          </p>
        </div>

        <button
          onClick={onTasksUpdated}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 flex items-center space-x-2 transition shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
          <span>刷新流水线任务</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Task Pipeline List */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-xs">商品流水线任务列表 ({tasks.length})</h3>
            <span className="text-[10px] text-slate-400">点击查看详细 Trace 日志</span>
          </div>

          <div className="space-y-4">
            {tasks.map((task) => {
              const isSelected = activeTaskLog?.id === task.id;

              return (
                <div
                  key={task.id}
                  onClick={() => setActiveTaskLog(task)}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-slate-950 border-indigo-500 shadow-lg shadow-indigo-950/40'
                      : 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700'
                  }`}
                >
                  {/* Task ID & Overall Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <img
                        src={task.optimizedImage || task.originalImage}
                        alt="Product thumbnail"
                        className="w-12 h-12 object-cover rounded-lg border border-slate-800 shrink-0 bg-slate-900"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/80">
                            {task.id}
                          </span>
                          <span className="text-xs font-bold text-white truncate max-w-[200px]">
                            {task.productTitle || '待确定标题商品'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{task.message}</p>
                      </div>
                    </div>

                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full shrink-0 ${
                      task.status === 'published' || task.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : task.status === 'failed'
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : task.status === 'review'
                        ? 'bg-amber-950 text-amber-400 border border-amber-800'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                    }`}>
                      {task.status === 'published' ? '✔ 已成功发布' : task.status === 'failed' ? '✖ 发生异常' : task.status === 'review' ? '待审核发布' : '处理中...'}
                    </span>
                  </div>

                  {/* 4 Pipeline Step Indicators */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-900 text-[10px]">
                    {/* Step 1 */}
                    <div className="flex items-center space-x-1 text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3 h-3 shrink-0" />
                      <span>图片上传</span>
                    </div>

                    {/* Step 2 */}
                    <div className={`flex items-center space-x-1 font-semibold ${
                      task.currentStep === 'image_completed' || task.currentStep === 'content_completed' || task.currentStep === 'published'
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}>
                      {task.currentStep === 'image_completed' || task.currentStep === 'content_completed' || task.currentStep === 'published' ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 shrink-0" />
                      )}
                      <span>ChatGPT 优化</span>
                    </div>

                    {/* Step 3 */}
                    <div className={`flex items-center space-x-1 font-semibold ${
                      task.currentStep === 'content_completed' || task.currentStep === 'published'
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}>
                      {task.currentStep === 'content_completed' || task.currentStep === 'published' ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 shrink-0" />
                      )}
                      <span>Gemini 生成</span>
                    </div>

                    {/* Step 4 */}
                    <div className={`flex items-center space-x-1 font-semibold ${
                      task.currentStep === 'published'
                        ? 'text-emerald-400'
                        : task.currentStep === 'review'
                        ? 'text-amber-400'
                        : 'text-slate-500'
                    }`}>
                      {task.currentStep === 'published' ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : task.currentStep === 'review' ? (
                        <AlertCircle className="w-3 h-3 shrink-0" />
                      ) : (
                        <Clock className="w-3 h-3 shrink-0" />
                      )}
                      <span>WooCommerce</span>
                    </div>
                  </div>

                  {/* Step Failures & Retry Action Buttons */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>耗时: {task.elapsedSeconds || 12}s</span>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepRetry(task.id, 'chatgpt');
                        }}
                        disabled={retryingStep === `${task.id}-chatgpt`}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[10px] font-medium rounded border border-slate-700 flex items-center space-x-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重试 ChatGPT</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepRetry(task.id, 'gemini');
                        }}
                        disabled={retryingStep === `${task.id}-gemini`}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-medium rounded border border-slate-700 flex items-center space-x-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重试 Gemini</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStepRetry(task.id, 'woocommerce');
                        }}
                        disabled={retryingStep === `${task.id}-woocommerce`}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-[10px] font-medium rounded border border-slate-700 flex items-center space-x-1 transition"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>重发 WP API</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Cols: Live Terminal Log Console */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <h3 className="font-semibold text-white text-xs">流水线 Trace 日志</h3>
            </div>
            {activeTaskLog && (
              <span className="text-[10px] font-mono text-slate-400">{activeTaskLog.id}</span>
            )}
          </div>

          {activeTaskLog ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 space-y-1">
                <p><strong className="text-slate-400">当前任务:</strong> {activeTaskLog.productTitle || activeTaskLog.id}</p>
                {activeTaskLog.errorLog && (
                  <p className="text-rose-400 font-mono text-[11px]"><strong>错误记录:</strong> {activeTaskLog.errorLog}</p>
                )}
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-emerald-400 h-96 overflow-y-auto space-y-2 shadow-inner">
                {activeTaskLog.logs?.map((logLine, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {logLine}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-slate-500 text-xs">
              点击左侧任务项查看详细 API 与 AI 执行 Trace
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
