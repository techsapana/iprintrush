'use client';

import React, { useState, useEffect, useRef } from 'react';

export default function OrderChat({ orderId, role }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  
  const endOfMessagesRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`);
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

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024 * 1024) {
      setError('File size exceeds 100MB limit.');
      return;
    }

    setUploading(true);
    setError('');
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
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachmentUrl) return;

    setSending(true);
    setError('');
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
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
      
      setMessages((prev) => [...prev, data.message]);
      setNewMessage('');
      setAttachmentUrl('');
      setAttachmentName('');
    } catch (err) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
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
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_type === role;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${isMe ? 'bg-[#29b6f6] text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                  <div className="text-xs opacity-75 mb-1">
                    {msg.sender_type === 'admin' ? 'Admin' : 'Customer'} • {new Date(msg.created_at).toLocaleString()}
                  </div>
                  {msg.message && <div className="whitespace-pre-wrap text-sm">{msg.message}</div>}
                  {msg.attachment_url && (
                    <a 
                      href={msg.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`mt-2 flex items-center gap-2 p-2 rounded text-xs font-medium ${isMe ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      {msg.attachment_name || 'Download Attachment'}
                    </a>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
        
        {attachmentUrl && (
          <div className="mb-2 flex items-center gap-2 text-sm bg-gray-50 p-2 rounded border border-gray-200">
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
            <label className="cursor-pointer flex items-center justify-center p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors" title="Attach Proof/File">
              {uploading ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-[#29b6f6] rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
              <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
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
