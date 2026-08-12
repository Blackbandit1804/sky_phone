export function bindMediaRecorderError(
  recorder: MediaRecorder,
  isCurrent: () => boolean,
  onError: (event: Event) => void,
): () => void {
  let bound = true
  const handleError = (event: Event): void => {
    if (!bound || !isCurrent()) return
    bound = false
    recorder.removeEventListener('error', handleError)
    onError(event)
  }
  recorder.addEventListener('error', handleError)
  return () => {
    if (!bound) return
    bound = false
    recorder.removeEventListener('error', handleError)
  }
}

export async function stopMediaRecorder(recorder: MediaRecorder): Promise<void> {
  if (recorder.state === 'inactive') return

  await new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      recorder.removeEventListener('stop', onStop)
      recorder.removeEventListener('error', onError)
    }
    const onStop = (): void => {
      cleanup()
      resolve()
    }
    const onError = (): void => {
      cleanup()
      reject(new Error('media_recorder_stop_failed'))
    }

    recorder.addEventListener('stop', onStop, { once: true })
    recorder.addEventListener('error', onError, { once: true })
    try {
      recorder.stop()
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}

export function setBoundedMapEntry<Key, Value>(
  entries: Map<Key, Value>,
  key: Key,
  value: Value,
  maximumSize: number,
): void {
  entries.delete(key)
  entries.set(key, value)
  while (entries.size > Math.max(0, maximumSize)) {
    const oldest = entries.keys().next()
    if (oldest.done) break
    entries.delete(oldest.value)
  }
}
