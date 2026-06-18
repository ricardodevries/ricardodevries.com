<script lang="ts">
  import { actions } from "astro:actions";
  import { authClient } from "@/lib/auth-client";
  import MarkdownHelp from "@/components/MarkdownHelp.svelte";
  import type { PublicAuthProvider } from "@/lib/auth-providers";
  import { onMount } from "svelte";

  interface Props {
    postSlug: string;
  }

  interface Comment {
    id: string;
    parentId: string | null;
    authorName: string;
    authorImage: string | null;
    bodyHtml: string;
    status: string;
    createdAt: string;
  }

  const { postSlug }: Props = $props();

  const session = authClient.useSession();

  let comments = $state<Comment[]>([]);
  let providers = $state<PublicAuthProvider[]>([]);
  let body = $state("");
  let replyBody = $state("");
  let replyingToId = $state<string | null>(null);
  let error = $state<string | null>(null);
  let replyError = $state<string | null>(null);
  let notice = $state<string | null>(null);
  let canModerate = $state(false);
  let loading = $state(true);
  let submitting = $state(false);
  let submittingReplyId = $state<string | null>(null);
  let moderatingCommentId = $state<string | null>(null);

  function topLevelComments() {
    return comments.filter((comment) => !comment.parentId);
  }

  function repliesFor(commentId: string) {
    return comments.filter((comment) => comment.parentId === commentId);
  }

  async function loadComments() {
    loading = true;
    error = null;

    try {
      const response = await fetch(
        `/api/comments?${new URLSearchParams({ postSlug })}`,
        {
          headers: {
            accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Could not load comments.");
      }

      const data = (await response.json()) as {
        comments: Comment[];
        canModerate: boolean;
        authProviders: PublicAuthProvider[];
      };
      comments = data.comments;
      canModerate = data.canModerate;
      providers = data.authProviders;
    } catch (err) {
      error = err instanceof Error ? err.message : "Could not load comments.";
    } finally {
      loading = false;
    }
  }

  async function signIn(provider: PublicAuthProvider["id"]) {
    const callbackURL = new URL(
      `${window.location.pathname}${window.location.search}#comments`,
      window.location.origin,
    ).toString();

    const result = await authClient.signIn.social({
      provider,
      callbackURL,
      errorCallbackURL: callbackURL,
    });

    if (result.error) {
      error = result.error.message || "Could not start sign in.";
    }
  }

  async function signOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.reload();
        },
      },
    });
  }

  function toggleReply(commentId: string) {
    replyingToId = replyingToId === commentId ? null : commentId;
    replyBody = "";
    replyError = null;
    error = null;
  }

  async function submitComment(parentId?: string) {
    const isReply = Boolean(parentId);
    const selectedBody = isReply ? replyBody : body;
    const trimmed = selectedBody.trim();

    if (!trimmed) {
      if (isReply) {
        replyError = "Reply cannot be empty.";
      } else {
        error = "Comment cannot be empty.";
      }

      return;
    }

    if (isReply) {
      submittingReplyId = parentId ?? null;
    } else {
      submitting = true;
    }

    error = null;
    replyError = null;
    notice = null;

    const result = await actions.addComment({
      postSlug,
      ...(parentId ? { parentId } : {}),
      body: trimmed,
    });

    if (isReply) {
      submittingReplyId = null;
    } else {
      submitting = false;
    }

    if (result.error) {
      if (isReply) {
        replyError = result.error.message || "Could not post reply.";
      } else {
        error = result.error.message || "Could not post comment.";
      }

      return;
    }

    comments = [...comments, result.data.comment];

    if (isReply) {
      replyBody = "";
      replyingToId = null;
      notice = "Reply submitted for review.";
    } else {
      body = "";
      notice = "Comment submitted for review.";
    }
  }

  async function moderateComment(id: string, action: "approve" | "reject") {
    moderatingCommentId = id;
    error = null;
    notice = null;

    const result =
      action === "approve"
        ? await actions.approveComment({ id })
        : await actions.rejectComment({ id });

    moderatingCommentId = null;

    if (result.error) {
      error = result.error.message || "Could not moderate comment.";

      return;
    }

    if (action === "approve") {
      comments = comments.map((comment) =>
        comment.id === id ? result.data.comment : comment,
      );
      notice = "Comment approved.";

      return;
    }

    comments = comments.filter((comment) => comment.id !== id);
    notice = "Comment rejected.";
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      hourCycle: "h23",
    }).format(new Date(date));
  }

  onMount(() => {
    void loadComments();
  });
</script>

<section id="comments" class="comments" aria-labelledby="comments-title">
  <div class="comments-header">
    <h2 id="comments-title">Comments</h2>
    <span class="comments-count">{comments.length}</span>
  </div>

  {#if error}
    <p class="comments-message" role="alert">{error}</p>
  {/if}

  {#if notice}
    <p class="comments-message comments-message--success" role="status">
      {notice}
    </p>
  {/if}

  <div class="comment-composer">
    {#if $session.isPending}
      <p class="comments-muted">Checking session...</p>
    {:else if $session.data?.user}
      <div class="comment-user">
        <div class="comment-user-info">
          {#if $session.data.user.image}
            <img src={$session.data.user.image} alt="" width="32" height="32" />
          {/if}
          <span>{$session.data.user.name}</span>
        </div>
        <button type="button" onclick={signOut}>Sign out</button>
      </div>

      <form
        class="comment-form"
        onsubmit={(event) => {
          event.preventDefault();
          void submitComment();
        }}
      >
        <label class="sr-only" for="comment-body">Comment</label>
        <textarea
          id="comment-body"
          name="body"
          bind:value={body}
          maxlength="1500"
          placeholder="Write a comment"
          rows="5"
          required
        ></textarea>
        <input
          aria-hidden="true"
          autocomplete="off"
          class="comment-honeypot"
          name="website"
          tabindex="-1"
          type="text"
        />
        <div class="comment-form-footer">
          <div class="comment-form-meta">
            <span>{body.trim().length}/1500</span>
            <span class="dot" aria-hidden="true"></span>
            <MarkdownHelp id="comment-markdown-help" />
          </div>
          <button type="submit" disabled={submitting}>
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </div>
      </form>
    {:else}
      <div class="comment-signin">
        {#each providers as provider (provider.id)}
          <button type="button" onclick={() => signIn(provider.id)}>
            Sign in with {provider.label}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="comment-list" aria-live="polite" aria-busy={loading}>
    {#if loading}
      <p class="comments-muted">Loading comments...</p>
    {:else if topLevelComments().length === 0}
      <p>No comments yet.</p>
    {:else}
      {#each topLevelComments() as comment (comment.id)}
        <article class="comment">
          <header class="comment-meta">
            {#if comment.authorImage}
              <img src={comment.authorImage} alt="" width="32" height="32" />
            {/if}
            <div class="comment-meta-main">
              <h3>{comment.authorName}</h3>
              <time datetime={comment.createdAt}>
                {formatDate(comment.createdAt)}
              </time>
            </div>
            {#if comment.status === "pending"}
              <div class="comment-moderation-actions">
                <span class="comment-status">Pending</span>
                {#if canModerate}
                  <button
                    type="button"
                    disabled={moderatingCommentId === comment.id}
                    onclick={() => moderateComment(comment.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={moderatingCommentId === comment.id}
                    onclick={() => moderateComment(comment.id, "reject")}
                  >
                    Reject
                  </button>
                {/if}
              </div>
            {:else if $session.data?.user}
              <button
                class="comment-reply-button comment-reply-button--meta"
                type="button"
                onclick={() => toggleReply(comment.id)}
              >
                {replyingToId === comment.id ? "Cancel reply" : "Reply"}
              </button>
            {/if}
          </header>
          <div class="comment-body comment-markdown">
            <!-- eslint-disable-next-line svelte/no-at-html-tags -->
            {@html comment.bodyHtml}
          </div>

          {#if replyingToId === comment.id}
            <form
              class="comment-form comment-reply-form"
              onsubmit={(event) => {
                event.preventDefault();
                void submitComment(comment.id);
              }}
            >
              <label class="sr-only" for={`reply-body-${comment.id}`}>
                Reply
              </label>
              <textarea
                id={`reply-body-${comment.id}`}
                name="body"
                bind:value={replyBody}
                maxlength="1500"
                placeholder={`Reply to ${comment.authorName}`}
                rows="4"
                required
              ></textarea>
              <div class="comment-form-footer">
                <div class="comment-form-meta">
                  <span>{replyBody.trim().length}/1500</span>
                  <span class="dot" aria-hidden="true"></span>
                  <MarkdownHelp id={`reply-markdown-help-${comment.id}`} />
                </div>
                <div class="comment-form-actions">
                  <button
                    class="comment-link-button"
                    type="button"
                    onclick={() => toggleReply(comment.id)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReplyId === comment.id}
                  >
                    {submittingReplyId === comment.id ? "Posting..." : "Post reply"}
                  </button>
                </div>
              </div>
              {#if replyError && replyingToId === comment.id}
                <p class="comments-message comment-reply-message" role="alert">
                  {replyError}
                </p>
              {/if}
            </form>
          {/if}
        </article>

        {#if repliesFor(comment.id).length > 0}
          <div class="comment-replies">
            {#each repliesFor(comment.id) as reply (reply.id)}
              <article class="comment comment--reply">
                <header class="comment-meta">
                  {#if reply.authorImage}
                    <img src={reply.authorImage} alt="" width="32" height="32" />
                  {/if}
                  <div class="comment-meta-main">
                    <h3>{reply.authorName}</h3>
                    <time datetime={reply.createdAt}>
                      {formatDate(reply.createdAt)}
                    </time>
                  </div>
                  {#if reply.status === "pending"}
                    <div class="comment-moderation-actions">
                      <span class="comment-status">Pending</span>
                      {#if canModerate}
                        <button
                          type="button"
                          disabled={moderatingCommentId === reply.id}
                          onclick={() => moderateComment(reply.id, "approve")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={moderatingCommentId === reply.id}
                          onclick={() => moderateComment(reply.id, "reject")}
                        >
                          Reject
                        </button>
                      {/if}
                    </div>
                  {/if}
                </header>
                <div class="comment-body comment-markdown">
                  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                  {@html reply.bodyHtml}
                </div>
              </article>
            {/each}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</section>
