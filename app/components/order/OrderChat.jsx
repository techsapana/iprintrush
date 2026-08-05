'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

export default function OrderChat({ orderId, role }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  
  const endOfMessagesRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/messages?context=${role}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Simple polling every 30 seconds
    const interval = setInterval(fetchMessages, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const scrollContainerRef = useRef(null);

  useEffect(() => {
    // Scroll only the chat container, not the whole window
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const fileInputRef = useRef(null);



  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      toast.error('File size exceeds 100MB limit.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    toast.loading('Uploading file...', { id: 'chat-upload' });
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'proof');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setAttachmentUrl(data.url);
      setAttachmentName(file.name);
      toast.success('File attached successfully!', { id: 'chat-upload' });
    } catch (err) {
      toast.error(err.message || 'Upload failed. Invalid file type?', { id: 'chat-upload' });
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };


  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachmentUrl) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/messages?context=${role}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage.trim(),
          attachmentUrl,
          attachmentName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send message');
      
      setMessages((prev) => {
        if (prev.some(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setNewMessage('');
      setAttachmentUrl('');
      setAttachmentName('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    setDeletingId(messageId);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/messages?context=${role}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete message');
      
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      setError(err.message || 'Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded-lg"></div>;
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden flex flex-col h-[500px]">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Order Messaging & Proofs</h3>
        <p className="text-xs text-gray-500">Communicate directly regarding this order.</p>
      </div>
      
      <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50 scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === role;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`group max-w-[80%] rounded-lg p-3 relative ${isMe ? 'bg-[#29b6f6] text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-xs opacity-75 mb-1">
                      {msg.sender_type === 'admin' ? 'Admin' : 'Customer'} • {new Date(msg.created_at).toLocaleString()}
                    </div>
                    {isMe && (
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={deletingId === msg.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white hover:text-red-200 disabled:opacity-50"
                        title="Delete message"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {msg.message && <div className="whitespace-pre-wrap text-sm">{msg.message}</div>}
                  {msg.attachment_url && (
                    <div className="mt-2 flex flex-col gap-1">
                      {msg.attachment_name && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.attachment_name) ? (
                        <div className="rounded overflow-hidden border border-gray-200/50 bg-white/50 flex justify-center p-1">
                          <img 
                            src={msg.attachment_url} 
                            alt={msg.attachment_name} 
                            className="max-w-[200px] max-h-[120px] object-contain rounded-sm"
                          />
                        </div>
                      ) : null}
                      
                      <div className="flex gap-2">
                        <a 
                          href={msg.attachment_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`flex-1 flex items-center justify-center gap-1 p-2 rounded text-xs font-medium ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </a>
                        <a 
                          href={`${msg.attachment_url}${msg.attachment_url.includes('?') ? '&' : '?'}download=1`}
                          download={msg.attachment_name || true}
                          className={`flex-1 flex items-center justify-center gap-1 p-2 rounded text-xs font-medium ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
        
        {attachmentUrl && (
          <div className="mb-2 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border border-gray-200">
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="truncate text-gray-700">{attachmentName || 'Attachment ready'}</span>
              <button type="button" onClick={() => { setAttachmentUrl(''); setAttachmentName(''); }} className="ml-auto text-red-500 hover:text-red-700">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <span className="text-xs text-[#29b6f6] font-medium flex items-center gap-1 animate-pulse">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              File ready! Click the send button to submit your message.
            </span>
          </div>
        )}

        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#29b6f6] resize-none"
              rows={2}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label 
              className={`cursor-pointer flex items-center justify-center p-2 border border-gray-300 rounded-lg transition-colors ${uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-50 text-gray-600'}`}
              title="Attach Proof/File"
            >
              {uploading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload}
                disabled={uploading} 
              />
            </label>
            <button
              type="button"
              onClick={handleSendMessage}
              disabled={sending || uploading || (!newMessage.trim() && !attachmentUrl)}
              className="p-2 bg-[#29b6f6] text-white rounded-lg hover:bg-[#1e8fc4] disabled:opacity-50 transition-colors flex items-center justify-center"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
