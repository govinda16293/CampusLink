import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MESSAGE_MAX } from '@campuslink/shared';
import { messagesApi } from '../api/messages';
import { useAuthStore } from '../store/authStore';
import { getSocket } from '../lib/socket';
import { Avatar } from './ui/Avatar';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

/**
 * The lobby's group chat.
 *
 * History arrives over HTTP and new messages arrive over the socket, but the two are merged by id
 * rather than concatenated — the sender is in the room, so their own message comes back twice:
 * once in the POST response and once in the broadcast. Keying by id makes that harmless, and it
 * is also what keeps a reconnection from duplicating the page it reloads.
 *
 * Sending is a POST. The socket is never written to; see api/messages.js.
 */
export function LobbyChat({ goalId, writable }) {
  const token = useAuthStore((state) => state.token);
  const viewerId = useAuthStore((state) => state.user?.id);

  const [messages, setMessages] = useState([]);
  const [state, setState] = useState({ status: 'loading', error: null });
  const [olderCursor, setOlderCursor] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [evicted, setEvicted] = useState(false);

  const scrollerRef = useRef(null);
  const atBottomRef = useRef(true);

  /** Messages are held oldest-first for display; the API pages them newest-first. */
  const mergeMessages = useCallback((incoming) => {
    setMessages((current) => {
      const byId = new Map(current.map((message) => [message.id, message]));
      for (const message of incoming) byId.set(message.id, message);
      return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    });
  }, []);

  // First page of history.
  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading', error: null });
    messagesApi
      .list(goalId)
      .then(({ messages: page, nextBefore }) => {
        if (cancelled) return;
        mergeMessages(page);
        setOlderCursor(nextBefore);
        setState({ status: 'ready', error: null });
      })
      .catch((error) => !cancelled && setState({ status: 'error', error }));
    return () => {
      cancelled = true;
    };
  }, [goalId, mergeMessages]);

  // Live delivery. The room is joined through the server, which re-checks membership against the
  // database — a room name sent from here is never taken at its word.
  useEffect(() => {
    const socket = getSocket(token);
    if (!socket) return undefined;

    const onMessage = ({ message }) => message.goalId === goalId && mergeMessages([message]);
    const onEvicted = (payload) => payload?.goalId === goalId && setEvicted(true);

    const joinRoom = () => socket.emit('lobby:join', goalId);
    joinRoom();
    // Rejoined rather than assumed: a reconnection is a new connection on the server, in no rooms.
    socket.on('connect', joinRoom);
    socket.on('message:new', onMessage);
    socket.on('lobby:evicted', onEvicted);

    return () => {
      socket.emit('lobby:leave', goalId);
      socket.off('connect', joinRoom);
      socket.off('message:new', onMessage);
      socket.off('lobby:evicted', onEvicted);
    };
  }, [goalId, token, mergeMessages]);

  // Follow the conversation, but only when the reader is already at the bottom — yanking the
  // view down while somebody is reading back through history is worse than missing a message.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && atBottomRef.current) scroller.scrollTop = scroller.scrollHeight;
  }, [messages]);

  function handleScroll(event) {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    atBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  }

  async function loadOlder() {
    if (!olderCursor) return;
    setLoadingOlder(true);
    const scroller = scrollerRef.current;
    const before = scroller?.scrollHeight ?? 0;
    try {
      const { messages: page, nextBefore } = await messagesApi.list(goalId, {
        before: olderCursor,
      });
      atBottomRef.current = false;
      mergeMessages(page);
      setOlderCursor(nextBefore);
      // Hold the reader's place: without this, prepending a page jumps them to the top.
      requestAnimationFrame(() => {
        if (scroller) scroller.scrollTop = scroller.scrollHeight - before;
      });
    } finally {
      setLoadingOlder(false);
    }
  }

  async function handleSend(event) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setSendError(null);
    try {
      const { message } = await messagesApi.send(goalId, body);
      atBottomRef.current = true;
      mergeMessages([message]);
      setDraft('');
    } catch (error) {
      // The draft is deliberately kept, so a failed send does not lose what someone typed.
      setSendError(error);
    } finally {
      setSending(false);
    }
  }

  if (state.status === 'error') {
    return <Alert tone="error">{state.error.message}</Alert>;
  }

  return (
    <div>
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="scrollbar-none max-h-96 overflow-y-auto rounded-[1.25rem] bg-white/25 p-4"
      >
        {olderCursor && (
          <div className="flex justify-center pb-3">
            <Button size="sm" variant="secondary" loading={loadingOlder} onClick={loadOlder}>
              Load earlier messages
            </Button>
          </div>
        )}

        {state.status === 'loading' && (
          <p className="py-6 text-center text-[15px] text-label-secondary">Loading the chat…</p>
        )}

        {state.status === 'ready' && messages.length === 0 && (
          <p className="py-6 text-center text-[15px] text-label-secondary">
            No messages yet. Say hello and sort out where to meet.
          </p>
        )}

        <ul className="space-y-3">
          {messages.map((message, index) => (
            <MessageBubble
              key={message.id}
              message={message}
              mine={message.sender.id === viewerId}
              // Consecutive messages from one person share a heading, the way a chat app groups
              // them — the name on every line makes a short back-and-forth unreadable.
              grouped={messages[index - 1]?.sender.id === message.sender.id}
            />
          ))}
        </ul>
      </div>

      {evicted ? (
        <Alert tone="info" className="mt-4">
          You are no longer in this group, so the chat is closed.
        </Alert>
      ) : writable ? (
        <form onSubmit={handleSend} className="mt-4">
          <div className="flex items-end gap-2">
            <label htmlFor="lobby-message" className="sr-only">
              Message the group
            </label>
            <input
              id="lobby-message"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              maxLength={MESSAGE_MAX}
              placeholder="Message the group"
              autoComplete="off"
              className="glass-field min-h-12 flex-1 rounded-full px-5 text-[15px] text-label placeholder:text-label-tertiary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
            />
            <Button type="submit" loading={sending} disabled={draft.trim().length === 0}>
              Send
            </Button>
          </div>
          <Alert tone="error" className="mt-3">
            {sendError?.message}
          </Alert>
        </form>
      ) : (
        <p className="mt-4 text-[13px] text-label-secondary">
          This goal was called off, so the chat is closed. The history stays here.
        </p>
      )}
    </div>
  );
}

/** One message. Yours sit on the right without a name; everyone else's carry theirs. */
function MessageBubble({ message, mine, grouped }) {
  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <li className={`flex items-end gap-2 ${mine ? 'flex-row-reverse' : ''}`}>
      <span className={grouped ? 'w-8 shrink-0' : 'shrink-0'}>
        {!grouped && !mine && (
          <Avatar
            name={message.sender.name}
            id={message.sender.id}
            photoUrl={message.sender.photoUrl}
            size="xs"
          />
        )}
      </span>

      <div className={`max-w-[75%] ${mine ? 'text-right' : ''}`}>
        {!grouped && !mine && (
          <p className="mb-1 pl-1 text-[12px] font-semibold text-label-secondary">
            {message.sender.name}
          </p>
        )}
        <div
          className={[
            'inline-block rounded-2xl px-3.5 py-2 text-left text-[15px] leading-relaxed',
            mine ? 'bg-action text-white' : 'bg-white/70 text-label',
          ].join(' ')}
        >
          <p className="whitespace-pre-wrap break-words">{message.body}</p>
          <p className={`mt-0.5 text-[11px] ${mine ? 'text-white/70' : 'text-label-tertiary'}`}>
            {time}
          </p>
        </div>
      </div>
    </li>
  );
}
