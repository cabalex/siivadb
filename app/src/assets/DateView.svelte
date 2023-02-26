<script lang="ts">
    export let date: number;

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    $: dateObj = new Date(date);
</script>

<span class="date" title={dateObj.toLocaleString()}>
    {months[dateObj.getMonth()]} {dateObj.getDate()} <b>{dateObj.getFullYear()}</b>
</span>

<style>
    .date {

    }
    .date h3 {
        margin: 0;
        font-size: 1.5em;
    }
    .date h4 {
        margin: 0;
        font-size: 1.2em;
        white-space: nowrap;
    }
</style>