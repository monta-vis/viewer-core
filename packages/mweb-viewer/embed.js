/**
 * Montavis Embed Helper
 *
 * Drop-in script for auto-sizing mweb iframes on plain HTML pages.
 * Listens for postMessage events from the mweb viewer and adjusts
 * the iframe height automatically.
 *
 * Usage (plain HTML):
 *   <iframe data-montavis src="./instruction/index.html" style="width:100%;border:none;"></iframe>
 *   <script src="./instruction/embed.js"></script>
 *
 * Multiple iframes are supported — each is matched by e.source.
 *
 * ---
 *
 * For React parent pages, do NOT use this script (DOM manipulation
 * conflicts with React's rendering). Use a hook instead:
 *
 *   function useMontavisEmbed() {
 *     const iframeRef = useRef(null);
 *     const [height, setHeight] = useState();
 *     const [isStarted, setIsStarted] = useState(false);
 *     const isStartedRef = useRef(false);
 *
 *     useEffect(() => {
 *       const handler = (e) => {
 *         if (!e.data || typeof e.data !== 'object') return;
 *         if (iframeRef.current?.contentWindow !== e.source) return;
 *
 *         switch (e.data.type) {
 *           case 'mweb-resize':
 *             if (!isStartedRef.current) setHeight(e.data.height);
 *             break;
 *           case 'mweb-start':
 *             isStartedRef.current = true;
 *             setIsStarted(true);
 *             break;
 *           case 'mweb-close':
 *             isStartedRef.current = false;
 *             setIsStarted(false);
 *             break;
 *         }
 *       };
 *       window.addEventListener('message', handler);
 *       return () => window.removeEventListener('message', handler);
 *     }, []);
 *
 *     return { iframeRef, height, isStarted };
 *   }
 *
 *   // Usage:
 *   // const { iframeRef, height, isStarted } = useMontavisEmbed();
 *   // <iframe ref={iframeRef} src="..." style={{ width: '28rem', height: height ?? 'auto' }} />
 *   // {isStarted && <FullscreenModal><iframe ... style={{ width: '100%', height: '100vh' }} /></FullscreenModal>}
 */
(function () {
  var MWEB_TYPES = Object.create(null);
  MWEB_TYPES['mweb-resize'] = 1;
  MWEB_TYPES['mweb-start'] = 1;
  MWEB_TYPES['mweb-close'] = 1;

  // Per-iframe saved state for fullscreen restore
  var savedState = new WeakMap();

  // Cache: contentWindow → iframe element (avoids querySelectorAll on every message)
  var sourceCache = new WeakMap();

  function findIframe(source) {
    var cached = sourceCache.get(source);
    if (cached && cached.contentWindow === source) return cached;
    sourceCache.delete(source);

    var iframes = document.querySelectorAll('iframe[data-montavis]');
    if (!iframes.length) iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === source) {
        sourceCache.set(source, iframes[i]);
        return iframes[i];
      }
    }
    return null;
  }

  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (!MWEB_TYPES[e.data.type]) return; // ignore unrelated messages

    var iframe = findIframe(e.source);
    if (!iframe) return;

    switch (e.data.type) {
        case 'mweb-resize':
          if (!savedState.has(iframe)) {
            iframe.style.height = e.data.height + 'px';
          }
          break;
        case 'mweb-start':
          savedState.set(iframe, {
            position: iframe.style.position,
            top: iframe.style.top,
            left: iframe.style.left,
            width: iframe.style.width,
            height: iframe.style.height,
            zIndex: iframe.style.zIndex,
            scrollX: window.scrollX,
            scrollY: window.scrollY,
            bodyOverflow: document.body.style.overflow,
          });
          iframe.style.position = 'fixed';
          iframe.style.top = '0';
          iframe.style.left = '0';
          iframe.style.width = '100%';
          iframe.style.height = '100%';
          iframe.style.zIndex = '999999';
          document.body.style.overflow = 'hidden';
          break;
        case 'mweb-close':
          var prev = savedState.get(iframe);
          if (prev) {
            iframe.style.position = prev.position;
            iframe.style.top = prev.top;
            iframe.style.left = prev.left;
            iframe.style.width = prev.width;
            iframe.style.height = prev.height;
            iframe.style.zIndex = prev.zIndex;
            document.body.style.overflow = prev.bodyOverflow;
            window.scrollTo(prev.scrollX, prev.scrollY);
            savedState.delete(iframe);
          }
          break;
      }
  });
})();
