import { useCallback, useEffect, useRef } from 'react';
import type { SyncState } from '../types/index';
import type { ClientMessage } from '../types/messages';

const DRIFT_THRESHOLD = 2.0;

interface UseDirectVideoPlayerOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  sync: SyncState;
  isHost: boolean;
  send: (msg: ClientMessage) => void;
}

export function useDirectVideoPlayer({ videoRef, sync, isHost, send }: UseDirectVideoPlayerOptions) {
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const syncRef = useRef(sync);
  syncRef.current = sync;
  const suppressEvents = useRef(false);
  const currentUrl = useRef<string>('');
  const syncReportInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Load video when URL changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sync.url) {
      currentUrl.current = '';
      return;
    }

    if (sync.url !== currentUrl.current) {
      suppressEvents.current = true;
      video.src = sync.url;
      video.currentTime = sync.timestamp;
      currentUrl.current = sync.url;
      if (sync.is_playing) {
        video.play().catch(() => {});
      }
      setTimeout(() => { suppressEvents.current = false; }, 1000);
    }
  }, [sync.url, videoRef]);

  // Sync correction on each sync message
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !sync.url) return;

    const currentTime = video.currentTime;
    const serverTime = sync.timestamp;
    const drift = Math.abs(currentTime - serverTime);

    if (drift > DRIFT_THRESHOLD) {
      suppressEvents.current = true;
      video.currentTime = serverTime;
      setTimeout(() => { suppressEvents.current = false; }, 500);
    }

    if (sync.is_playing && video.paused) {
      suppressEvents.current = true;
      video.play().catch(() => {});
      setTimeout(() => { suppressEvents.current = false; }, 500);
    } else if (!sync.is_playing && !video.paused) {
      suppressEvents.current = true;
      video.pause();
      setTimeout(() => { suppressEvents.current = false; }, 500);
    }
  }, [sync.timestamp, sync.is_playing, sync.url, videoRef]);

  // Host event listeners
  const onPlay = useCallback(() => {
    if (suppressEvents.current || !isHostRef.current) return;
    send({ type: 'play' });
  }, [send]);

  const onPause = useCallback(() => {
    if (suppressEvents.current || !isHostRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    send({ type: 'pause', timestamp: video.currentTime });
  }, [send, videoRef]);

  const onSeeked = useCallback(() => {
    if (suppressEvents.current || !isHostRef.current) return;
    const video = videoRef.current;
    if (!video) return;
    send({ type: 'seek', timestamp: video.currentTime });
  }, [send, videoRef]);

  const onEnded = useCallback(() => {
    if (suppressEvents.current || !isHostRef.current) return;
    send({ type: 'video_ended' });
  }, [send]);

  // Attach event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('ended', onEnded);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('ended', onEnded);
    };
  }, [videoRef, onPlay, onPause, onSeeked, onEnded]);

  // Sync report every 5s
  useEffect(() => {
    syncReportInterval.current = setInterval(() => {
      const video = videoRef.current;
      if (video && syncRef.current.url) {
        send({
          type: 'sync_report',
          timestamp: video.currentTime,
          state: video.paused ? 'paused' : 'playing',
        });
      }
    }, 5000);
    return () => clearInterval(syncReportInterval.current);
  }, [send, videoRef]);
}
