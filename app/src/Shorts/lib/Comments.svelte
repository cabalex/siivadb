<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import Comment, { type CommentInterface } from "./Comment.svelte";
  import CommentIcon from "svelte-material-icons/Comment.svelte";
  import OpenInNew from "svelte-material-icons/OpenInNew.svelte";
  import RipBrowser from "../../RipBrowser/RipBrowser";

  export let rip: RipBrowser["rips"][number];
  export let player: unknown;
  const dispatch = createEventDispatcher();

  const CLIENT_ID =
    "164066411168-8murj3ntetackkv9thh7sh929u83su9n.apps.googleusercontent.com";
  const REDIRECT_URI = location.origin + location.pathname; // Use the current page as the redirect URI

  let AUTH_TOKEN = localStorage.getItem("siivadb-yt-access-token");

  // Function to generate a random state value
  function generateCryptoRandomState() {
    const randomValues = new Uint32Array(2);
    window.crypto.getRandomValues(randomValues);

    // Encode as UTF-8
    const utf8Encoder = new TextEncoder();
    const utf8Array = utf8Encoder.encode(
      String.fromCharCode.apply(null, randomValues),
    );

    // Base64 encode the UTF-8 data
    return btoa(String.fromCharCode.apply(null, utf8Array))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  let comments: null | CommentInterface[] = null;
  async function fetchComments(ytid: string) {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet,replies&order=relevance&maxResults=100&videoId=${ytid}&access_token=${AUTH_TOKEN}`,
      {
        cache: "force-cache",
      },
    );
    const data = await response.json();

    if (!response.ok) {
      // error
      if (data.error && data.error.code === 401) {
        // Token expired
        localStorage.removeItem("siivadb-yt-access-token");
        AUTH_TOKEN = null;
      }
    }

    comments = data.items.map((x) => ({
      ...x.snippet,
      ...x.snippet.topLevelComment.snippet,
    }));
  }

  $: {
    if (AUTH_TOKEN && rip) {
      comments = null;
      fetchComments(rip.ytid);
    }
  }

  /*
   * Create form to request access token from Google's OAuth 2.0 server.
   */
  function oauth2SignIn() {
    // create random state value and store in local storage
    var state = generateCryptoRandomState();
    localStorage.setItem("state", state);

    // Google's OAuth 2.0 endpoint for requesting an access token
    var oauth2Endpoint = "https://accounts.google.com/o/oauth2/v2/auth";

    // Create element to open OAuth 2.0 endpoint in new window.
    var form = document.createElement("form");
    form.target = "_blank"; // Open in a new window.
    form.setAttribute("method", "GET"); // Send as a GET request.
    form.setAttribute("action", oauth2Endpoint);

    // Parameters to pass to OAuth 2.0 endpoint.
    var params = {
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: "https://www.googleapis.com/auth/youtube.force-ssl",
      state: state,
      include_granted_scopes: "true",
      response_type: "token",
    };

    // Add form parameters as hidden input values.
    for (var p in params) {
      var input = document.createElement("input");
      input.setAttribute("type", "hidden");
      input.setAttribute("name", p);
      input.setAttribute("value", params[p]);
      form.appendChild(input);
    }

    // Add form to page and submit it to open the OAuth 2.0 endpoint.
    document.body.appendChild(form);
    form.submit();
  }

  // Check AUTH_TOKEN on window refocus
  onMount(() => {
    function handleFocus() {
      const newToken = localStorage.getItem("siivadb-yt-access-token");
      if (newToken !== AUTH_TOKEN) {
        AUTH_TOKEN = newToken;
      }
    }
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  });

  let initialTouch = { y: 0, scroll: 0 };
</script>

<div
  class="comments-container"
  on:wheel={(e) => e.stopPropagation()}
  on:click={(e) => e.stopPropagation()}
>
  {#if !AUTH_TOKEN}
    <div class="access-required">
      <div class="access-required-header">
        <CommentIcon />
      </div>
      <h2>See what everyone's commenting (beta)</h2>
      <p>
        Due to YouTube API limitations, we need you to sign in with your Google
        account to read comments in SiIvaDB. Your information will remain
        on-device and won't be sent to anyone other than YouTube.
      </p>
      <p style="color: orange">
        You will be prompted to allow SiIvaDB to "See, edit, and permanently
        delete your YouTube videos, ratings, comments and captions". <b
          >SiIvaDB will only fetch comments of SiIvaGunner videos.</b
        > Unfortunately, this is the only permission that YouTube allows access to
        read comments.
      </p>
      <p style="font-size: 0.8em; color: #aaa">
        This is an experimental feature not yet verified by Google - you may be
        warned as such.
      </p>
    </div>
    <button
      class="menu-item"
      on:click={(e) => {
        e.stopPropagation();
        oauth2SignIn();
      }}
    >
      Sign in with Google <OpenInNew />
    </button>
    <button
      class="menu-item"
      style="padding-bottom: 25px"
      on:click={(e) => {
        e.stopPropagation();
        dispatch("close");
      }}>No thanks</button
    >
  {:else}
    <div
      class="comments"
      on:touchstart={(e) => {
        const target = e.currentTarget;
        initialTouch = { y: e.touches[0].clientY, scroll: target.scrollTop };
        if (
          target.scrollTop !== 0 &&
          target.scrollTop + target.clientHeight !== target.scrollHeight
        ) {
          e.stopPropagation();
        }
      }}
      on:touchmove={(e) => {
        const target = e.currentTarget;
        if (
          !(
            initialTouch.scroll + target.clientHeight === target.scrollHeight &&
            initialTouch.y > e.touches[0].clientY
          ) &&
          !(initialTouch.scroll === 0 && initialTouch.y < e.touches[0].clientY)
        ) {
          e.stopPropagation();
        }
      }}
      on:wheel={(e) => e.stopPropagation()}
    >
      {#if comments}
        {#each comments as comment}
          <Comment {comment} {player} />
        {/each}
      {:else}
        <div class="loading">Loading comments...</div>
      {/if}
    </div>
    <button
      class="menu-item"
      style="padding-bottom: 25px"
      on:click={(e) => {
        e.stopPropagation();
        dispatch("close");
      }}
    >
      Close comments
    </button>
  {/if}
</div>

<style>
  .comments-container {
    margin-top: 10px;
    border-top: 1px solid #333;
    cursor: default;
  }
  .access-required {
    padding: 10px;
    background-color: rgba(0, 0, 0, 0.2);
  }
  .access-required-header {
    display: flex;
    gap: 10px;
    font-size: 3rem;
    padding: 10px;
  }
  .access-required h2 {
    font-size: 1.2em;
    margin-top: 10px;
    margin-bottom: 10px;
  }
  .menu-item {
    justify-content: flex-start;
    text-align: left;
    width: 100%;
    padding: 20px 15px;
    border: none;
    border-top: 1px solid #333;
    background: none;
    color: white;
    border-radius: 0;
    transition: background-color 0.2s ease-in-out;
  }
  .menu-item.danger {
    color: #ff5555;
  }
  .menu-item:focus-visible,
  .menu-item:hover {
    outline: none;
    background-color: rgba(255, 255, 255, 0.2);
  }
  .comments {
    min-height: min(400px, calc(60dvh - 135px));
    height: min(400px, calc(60dvh - 135px));
    max-height: 400px;
    overflow-y: auto;
  }
  .comments .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    color: #ccc;
    height: 100%;
    background: linear-gradient(to right, #ccc, #777, #ccc);
    background-size: 20% 100%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: loading 3s infinite linear;
  }
  @keyframes loading {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 50% 50%;
    }
    100% {
      background-position: 100% 50%;
    }
  }
</style>
