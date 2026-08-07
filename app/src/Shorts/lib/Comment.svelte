<script lang="ts" context="module">
  export interface CommentInterface {
    authorChannelId: {
      value: string;
    };
    authorChannelUrl: string;
    authorDisplayName: string;
    authorProfileImageUrl: string;
    canRate: boolean;
    channelId: string;
    likeCount: number;
    publishedAt: string;
    textDisplay: string;
    textOriginal: string;
    updatedAt: string;
    videoId: string;
    viewerRating: string;
    // Property from top level
    id: string;
    canReply: boolean;
    isPublic: boolean;
    totalReplyCount: number;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import ThumbUp from "svelte-material-icons/ThumbUp.svelte";

  export let comment: CommentInterface;
  export let player: unknown;

  let commentP: HTMLParagraphElement;

  onMount(() => {
    if (commentP) {
      // search for timestamp links
      for (const a of commentP.querySelectorAll("a")) {
        const match = a.href.match(/t=(\d+)s?/);
        if (match) {
          const seconds = parseInt(match[1]);
          a.addEventListener("click", (e) => {
            e.preventDefault();
            // @ts-ignore
            player.seekTo(seconds, true);
          });
        }
      }
    }
  });
</script>

<div class="comment">
  <a
    class="comment-header"
    href={comment.authorChannelUrl}
    target="_blank"
    rel="noopener noreferrer"
  >
    <img
      src={comment.authorProfileImageUrl}
      alt={comment.authorDisplayName}
      referrerpolicy="no-referrer"
    />
    <span class="comment-author">{comment.authorDisplayName}</span>
    <span class="comment-date"
      >{new Date(comment.publishedAt).toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        year: "numeric",
        month: "short",
        day: "2-digit",
      })}</span
    >
  </a>
  <p bind:this={commentP}>{@html comment.textDisplay}</p>
  <p style="font-size: 0.8em; color: #aaa">
    <ThumbUp />
    {comment.likeCount}
    {#if comment.totalReplyCount > 0}
      •
      {comment.totalReplyCount}
      {comment.totalReplyCount === 1 ? "reply" : "replies"}
    {/if}
  </p>
</div>

<style>
  .comment {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    border-bottom: 1px solid #333;
    background-color: rgba(0, 0, 0, 0.5);
  }
  .comment p {
    margin: 0;
    overflow-wrap: break-word;
  }
  .comment-header {
    display: flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
    color: white;
  }
  .comment-header img {
    width: 30px;
    height: 30px;
    border-radius: 50%;
  }
  .comment-author {
    font-weight: bold;
  }
  .comment-date {
    font-size: 0.8em;
    color: #aaa;
  }
</style>
