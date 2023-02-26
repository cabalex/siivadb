<script lang="ts">
    import { onMount } from "svelte";
    import { options } from "../stores";
    import ThumbUpOutline from "svelte-material-icons/ThumbUpOutline.svelte";
    import OpenInNew from "svelte-material-icons/OpenInNew.svelte";
    import CommentOutline from "svelte-material-icons/CommentOutline.svelte";


    export let comments;

    let timeout = null;
    let index = 0;
    let elem;

    function setupComment() {
        if (index >= comments.length) {
            index = 0;
        }

        const comment = comments[index];

        elem.style.top = `${Math.max(200, Math.random() * (window.innerHeight / 2)) + 20}px`;
        elem.style.right = `${Math.random() * (window.innerWidth / 8) + 50}px`;

        elem.getElementsByClassName("comment-name")[0].innerText = comment.authorName;
        elem.getElementsByClassName("comment-body")[0].innerText = comment.text;
        elem.getElementsByTagName("img")[0].src = comment.authorPfp;
        elem.getElementsByClassName("comment-time")[0].innerText = comment.publishedAt;
        elem.getElementsByClassName("likes")[0].innerText = comment.likes;
        elem.getElementsByClassName("replies")[0].innerText = comment.replies;

        index++;

        timeout = setTimeout(() => {
            setupComment();
        }, 5000);
    }

    onMount(() => {
        setTimeout(() => {
            setupComment();
        })
    })

</script>

<div class="comment" bind:this={elem} style={`display: ${$options.showComments ? "block" : "none"}`}>
    <div class="comment-header">
        <img src="" alt="Profile" width="24" height="24">
        <b class="comment-name">Name</b>
        <span class="comment-time">2 days ago</span>
    </div>
    <div class="comment-body">
        Text here
    </div>
    <div class="comment-footer">
        <button>
            <ThumbUpOutline />
            <span class="likes">0</span>
        </button>
        <button>
            <CommentOutline />
            <span class="replies">0</span>
        </button>
    </div>
</div>

<style>
    .comment {
        position: fixed;
        top: 20px;
        right: 50px;
        max-width: min(calc(100% - 40px), 500px);

        z-index: 150;

        background-color: #111;
        border-radius: 10px;
        padding: 10px;

        animation: commentAnimation 5s cubic-bezier(.20,.6,.80,.9) infinite;
    }
    @keyframes commentAnimation {
        0% {
            transform: translateX(-50px);
            opacity: 0;
        }
        20% {
            transform: translateX(-30px);
            opacity: 1;
        }
        80% {
            transform: translateX(30px);
            opacity: 1;
        }
        100% {
            transform: translateX(50px);
            opacity: 0;
        }
    }
    .comment-header {
        display: flex;
        align-items: center;
        padding: 8px;

        display: flex;
        align-items: center;
        gap: 10px;
        text-align: left;
    }
    .comment img {
        border-radius: 100%;
    }
    .comment button {
        padding: 5px 10px;
    }
    .comment-body {
        text-align: left;
    }
    .comment-footer {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-top: 10px;
        gap: 10px;
    }
</style>