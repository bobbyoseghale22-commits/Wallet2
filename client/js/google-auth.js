/* ============================================================================
   Google Identity Services integration.
   Requires: <script src="https://accounts.google.com/gsi/client" async defer>
   and a meta tag: <meta name="google-client-id" content="...">
   ========================================================================== */

const MarshGoogle = (() => {
  function getClientId() {
    const meta = document.querySelector('meta[name="google-client-id"]');
    return meta ? meta.content.trim() : '';
  }

  async function handleCredential(response) {
    try {
      await Marsh.auth.google(response.credential);
      Marsh.toast('Signed in successfully.', 'success');
      const redirect = new URLSearchParams(location.search).get('redirect');
      setTimeout(() => (window.location.href = redirect || '/dashboard'), 600);
    } catch (err) {
      Marsh.toast(err.message || 'Google sign-in failed.', 'error');
    }
  }

  function init({ buttonHostId } = {}) {
    const clientId = getClientId();
    if (!clientId || clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
      Marsh.toast('Google Client ID not configured.', 'error', 6000);
      return;
    }

    function ready() {
      if (!window.google || !google.accounts) {
        return setTimeout(ready, 200);
      }
      google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
      });

      const host = buttonHostId && document.getElementById(buttonHostId);
      if (host) {
        google.accounts.id.renderButton(host, {
          theme: 'filled_black',
          size: 'large',
          shape: 'pill',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 280,
        });
      }
    }
    ready();
  }

  // Programmatic trigger (for custom buttons) via One Tap / prompt
  function prompt() {
    if (window.google && google.accounts) {
      google.accounts.id.prompt();
    }
  }

  return { init, prompt };
})();
