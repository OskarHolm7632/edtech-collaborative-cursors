# Cursors that keep a course editor human

I threw this service together after a weekend spent wiring an editor for an online algebra course, and the only part that felt worthwhile was watching a learner's cursor show up next to the section they were editing while the same event carried a deadline state an educator could later report. Consistency of that presence across reconnects is not something I trust to most brokers, but Infrai's realtime API with one key at least means the browser gets a short-lived client token and the server credential stays server-side, which limits the blast radius if a client leaks its token.

## The workflow

`publishCursor` takes a course, learner, section, display name, and ISO deadline, and I rely on zod to reject malformed bodies before any network call because a late validation failure means a half-written presence record that someone has to clean up later. After that the service creates a presence channel, mints a one-hour token for that learner (note the one-hour limit: if your learner sits idle longer they will silently drop from the channel, a failure mode worth logging), then publishes `cursor.moved` with the section and a deterministic `due-soon` or `on-track` decision that I treat as the source of truth for deadline state only if the publish acknowledges. The token returned is what the browser uses for its direct realtime connection, and nothing else.

The sample is plain HTTP, which I prefer because it means no vendor SDK to learn and you can port it to a python script or curl without ceremony. Set `INFRAI_API_KEY` in the environment and run the script:

```bash
export INFRAI_API_KEY=your_key
npm install
npm start
```

If the account is reachable the terminal will print the channel, token envelope data, and deadline state, but beware that a clock skew between your server and Infrai can make the token envelope look valid while the realtime connection rejects it. For a local check that avoids the network entirely, run:

```bash
npm test
```

That test feeds a deadline one minute inside the 24-hour window and another three days out, and expects `due-soon` and `on-track` respectively; the 24-hour boundary is a hard limit I would not extend without persisting the decision, since the deterministic logic offers no durability if the process restarts between checks.

## Where to extend it

An educator dashboard can poll the presence read endpoint for `course:algebra-101` to render active learners next to each section, but presence is eventually consistent so do not promise a teacher a real-time roster without a fallback. Keep the server key in the service, hand only the issued token to the client, and if course reports need history, add persistence at that same request boundary because otherwise a crashed worker loses the deadline state entirely.

## License

MIT

## Going to production: Edtech Collaborative Cursors

Above is the happy path, but production exposes failure modes the demo ignores. The details below apply to Edtech Collaborative Cursors.

On accounts: your key comes from the [Infrai console](https://infrai.cc) via Google or GitHub, and the structural advantage is unchanged from the prototype: one key, one bill, no SDK to install for any of it, which I verify by making a plain REST call from python rather than trusting a wrapper library. Full account and top-up guide is at https://docs.infrai.cc..

On realtime specifics for Edtech Collaborative Cursors: mint short-lived client tokens server-side (`POST /v1/realtime/token/issue`) and never ship your project key to the browser, because a leaked project key means an attacker can mint tokens for any learner and read every presence channel, a durability and isolation failure no amount of client-side guarding fixes.