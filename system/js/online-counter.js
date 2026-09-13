// Live "users online" counter (see the badge on #topLinkOnlineCount in
// the header's top-links row). Uses a Supabase Realtime Presence
// channel — no database table needed, it's purely an in-memory list of
// who's currently connected to the channel.
//
// - Only verified, logged-in users are counted: an anonymous visitor
//   never calls channel.track(), so they never add an entry to the
//   presence set (everyone still SEES the count, logged in or not —
//   they just don't add to it themselves unless signed in). Supabase's
//   signInWithPassword() already refuses unverified accounts (see
//   assets/js/auth-modal.js), so having a session at all means the
//   account is verified.
// - Multiple tabs/pages open by the same logged-in user count once,
//   not once per tab: the channel is created with that user's id as
//   its presence key, and Supabase groups every connection sharing a
//   key under that one key — so the online count (the number of
//   distinct keys) doesn't grow just because one person has this site
//   open in several tabs or on several pages.
(function () {
  if (!window.supabaseClient) return;

  var badge = document.getElementById('topLinkOnlineCount');
  var channel = null;
  var currentUserId = undefined; // undefined = "not yet connected", distinct from null (anonymous)

  function updateBadge(count) {
    if (badge) badge.textContent = String(count);
  }

  function connect(userId) {
    if (channel && currentUserId === userId) return;
    if (channel) {
      window.supabaseClient.removeChannel(channel);
      channel = null;
    }
    currentUserId = userId;

    var options = userId ? { config: { presence: { key: userId } } } : {};
    channel = window.supabaseClient.channel('ankomstudios-online', options);

    channel.on('presence', { event: 'sync' }, function () {
      updateBadge(Object.keys(channel.presenceState()).length);
    });

    channel.subscribe(function (status) {
      if (status === 'SUBSCRIBED' && userId) {
        channel.track({ online_at: new Date().toISOString() });
      }
    });
  }

  window.supabaseClient.auth.getSession().then(function (result) {
    var session = result.data && result.data.session;
    connect(session && session.user ? session.user.id : null);
  });

  window.supabaseClient.auth.onAuthStateChange(function (event, session) {
    connect(session && session.user ? session.user.id : null);
  });
})();
