'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, MessageSquare, RotateCcw, Send } from 'lucide-react';
import { RoleSlug } from '@/lib/types';
import { formatLagosDateTime } from '@/lib/timezone';
import { roleHasPermission } from '@/lib/auth/permissions';
import { AdminSnapshotData } from '@/components/admin/admin-types';

export function LiveChatModule({
  data,
  role,
  onRefresh,
}: {
  data: AdminSnapshotData;
  role: RoleSlug;
  onRefresh: () => Promise<void>;
}) {
  const canReply = roleHasPermission(role, 'chat:reply');
  const [filter, setFilter] = useState<'all' | 'open' | 'unread' | 'resolved'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(
    data.chatConversations[0]?.id || null
  );
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const sortedConversations = [...data.chatConversations]
    .sort((a, b) => (a.last_message_at < b.last_message_at ? 1 : -1))
    .filter((c) => {
      if (filter === 'open') return c.status === 'open';
      if (filter === 'unread') return c.unread_staff_count > 0;
      if (filter === 'resolved') return c.status === 'resolved';
      return true;
    });

  const activeConversation =
    data.chatConversations.find((c) => c.id === selectedId) || sortedConversations[0] || null;

  const threadMessages = activeConversation
    ? data.chatMessages
        .filter((m) => m.conversation_id === activeConversation.id)
        .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
    : [];

  useEffect(() => {
    if (!activeConversation || activeConversation.unread_staff_count === 0) return;
    fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', conversationId: activeConversation.id }),
    })
      .then((res) => {
        if (res.ok) return onRefresh();
        return undefined;
      })
      .catch(() => {});
  }, [activeConversation?.id, activeConversation?.unread_staff_count, activeConversation, onRefresh]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !replyText.trim() || !canReply) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/admin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply',
          conversationId: activeConversation.id,
          message: replyText.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not send reply.');
      } else {
        setReplyText('');
        await onRefresh();
      }
    } catch {
      setError('Network error sending message.');
    } finally {
      setSending(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!activeConversation || !canReply) return;
    const nextStatus = activeConversation.status === 'open' ? 'resolved' : 'open';
    await fetch('/api/admin/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'set_status',
        conversationId: activeConversation.id,
        status: nextStatus,
      }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#E5DFD5] p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#171614]">Guest Live Chat Inbox</h2>
          <p className="text-xs text-[#6B6459]">
            Messages submitted via the website chat widget appear here for Reception &amp; Management response.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 bg-[#F2EDE4]">
          {(['all', 'open', 'unread', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs font-medium capitalize whitespace-nowrap ${
                filter === tab ? 'bg-white text-[#171614]' : 'text-[#5C574F]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[500px]">
        {/* Left: Conversations list */}
        <div className="lg:col-span-5 bg-white border border-[#E5DFD5] divide-y divide-[#F2EDE4] overflow-y-auto max-h-[600px]">
          {sortedConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#6B6459]">
              No conversations in this filter.
            </div>
          ) : (
            sortedConversations.map((conv) => {
              const isSelected = activeConversation?.id === conv.id;
              const latestMsg = data.chatMessages
                .filter((m) => m.conversation_id === conv.id)
                .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-4 transition-colors space-y-1.5 ${
                    isSelected ? 'bg-[#FAF6EE]' : 'hover:bg-[#FAF8F4]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-[#171614] truncate">{conv.guest_name}</p>
                    {conv.unread_staff_count > 0 ? (
                      <span className="text-[11px] font-mono tabular-nums font-semibold text-[#8C6822]">
                        {conv.unread_staff_count} unread
                      </span>
                    ) : (
                      <span className="text-[11px] capitalize text-[#6B6459]">{conv.status}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#5C574F] truncate">
                    {conv.guest_email}
                    {conv.booking_reference ? ` · ${conv.booking_reference}` : ''}
                  </p>
                  <p className="text-xs text-[#3F3A32] truncate">
                    {latestMsg ? latestMsg.body : 'Conversation started'}
                  </p>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Active Thread */}
        <div className="lg:col-span-7 bg-white border border-[#E5DFD5] flex flex-col justify-between max-h-[600px]">
          {!activeConversation ? (
            <div className="p-10 text-center text-xs text-[#6B6459] my-auto space-y-2">
              <MessageSquare className="w-6 h-6 mx-auto text-[#8C6822]" aria-hidden="true" />
              <p>Select a guest conversation to read and reply.</p>
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-[#EFEAE0] flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#171614]">{activeConversation.guest_name}</p>
                  <p className="text-xs text-[#5C574F]">
                    {activeConversation.guest_email}
                    {activeConversation.booking_reference
                      ? ` · Ref ${activeConversation.booking_reference}`
                      : ''}
                  </p>
                </div>
                {canReply ? (
                  <button
                    type="button"
                    onClick={handleToggleStatus}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#D8D1C5] text-xs font-medium text-[#171614] hover:bg-[#FAF8F4] whitespace-nowrap"
                  >
                    {activeConversation.status === 'open' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                        <span>Mark Resolved</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Reopen Thread</span>
                      </>
                    )}
                  </button>
                ) : null}
              </div>

              <div className="flex-1 p-4 space-y-3 overflow-y-auto bg-[#FAF9F6]">
                {threadMessages.map((msg) => {
                  const isStaff = msg.sender_type === 'staff';
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] p-3 text-xs space-y-1 ${
                        isStaff
                          ? 'ml-auto bg-[#0D0D0E] text-[#FAF9F6]'
                          : 'bg-white border border-[#E5DFD5] text-[#171614]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[10px] opacity-75">
                        <span className="font-medium">{msg.sender_name}</span>
                        <span className="font-mono tabular-nums">{formatLagosDateTime(msg.created_at)}</span>
                      </div>
                      <p className="leading-relaxed">{msg.body}</p>
                    </div>
                  );
                })}
              </div>

              {canReply ? (
                <form onSubmit={handleSendReply} className="p-4 border-t border-[#EFEAE0] bg-white space-y-2">
                  {error ? <p className="text-xs text-red-700">{error}</p> : null}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder={`Reply to ${activeConversation.guest_name}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="h-10 flex-1 px-3 text-xs border border-[#D8D1C5] bg-[#FAF9F6]"
                    />
                    <button
                      type="submit"
                      disabled={sending}
                      className="h-10 px-4 inline-flex items-center gap-1.5 bg-[#0D0D0E] text-[#FAF9F6] text-xs font-medium hover:bg-[#24211D] disabled:opacity-60 whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{sending ? 'Sending...' : 'Send Reply'}</span>
                    </button>
                  </div>
                </form>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
