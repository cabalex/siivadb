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

    function prettyDate(time: Date) {
        let diff = (((new Date()).getTime() - time.getTime()) / 1000);
        let day_diff = Math.floor(diff / 86400);

        if (isNaN(day_diff) || day_diff < 0) return;

        return day_diff == 0 && (
            diff < 60 && "just now" ||
            diff < 120 && "1 minute ago" ||
            diff < 3600 && Math.floor(diff / 60) + " minutes ago" ||
            diff < 7200 && "1 hour ago" ||
            diff < 86400 && Math.floor(diff / 3600) + " hours ago") ||
            day_diff == 1 && "Yesterday" ||
            day_diff < 7 && day_diff + " days ago" ||
            day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago" ||
            day_diff < 365 && Math.ceil(day_diff / 30) + " months ago" ||
            Math.ceil(day_diff / 365) + " years ago";
    }


    function setupComment() {
        if (index >= comments.length) {
            index = 0;
        }

        const comment = comments[index];

        if (window.innerWidth < 900) {
            elem.style.top = '100px';
            elem.style.right = `calc(50% - ${window.innerWidth / 2}px)`;
            elem.style.animationName = "mobileAnimation";
        } else {
            elem.style.top = `${Math.max(200, Math.random() * (window.innerHeight / 2)) + 20}px`;
            elem.style.right = `${Math.random() * (window.innerWidth / 8) + 40}px`;
            elem.style.animationName = "desktopAnimation";
        }

        elem.getElementsByClassName("comment-name")[0].innerText = comment.authorName;
        elem.getElementsByClassName("comment-body")[0].innerText = comment.text;
        elem.getElementsByTagName("img")[0].src = comment.authorPfp;
        elem.getElementsByClassName("comment-time")[0].innerText = prettyDate(comment.publishedAt);
        elem.getElementsByClassName("likes")[0].innerText = comment.likes;
        elem.getElementsByClassName("replies")[0].innerText = comment.replies;
        elem.getElementsByClassName("replies")[0].parentElement.style.display = comment.replies > 0 ? "inline" : "none";

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
        box-shadow: 0 0 10px 0 rgba(0,0,0,0.5);
        border-radius: 5px;
        padding: 5px;

        animation: commentAnimation 5s cubic-bezier(.20,.6,.80,.9) infinite;
    }
    @media screen and (max-width: 900px) {
        .comment {
            width: calc(100% - 30px);
            max-width: calc(100% - 30px);
            left: 10px;

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
        max-height: 100px;
        overflow-y: auto;
    }
    .comment-footer {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-top: 10px;
        gap: 10px;
    }
</style>