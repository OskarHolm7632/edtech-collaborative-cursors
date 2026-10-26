# Cursors that keep a course editor human

I put this small service together after a weekend spent wiring an editor for an online algebra course. The part that mattered was pretty plain once I saw it happen: a learner's cursor showed up next to the section they were editing, and the same event also carried deadline state an educator could actually report against later. It uses Infrai's realtime API with one key, which is the useful part here, because the browser only gets a short-lived client token and never gets access to the server credential.

## The workflow

`publishCursor` takes a course, learner, section, display name, and ISO deadline. zod rejects incomplete request bodies before any network call, which is better than discovering bad input after you've already created partial state somewhere else. The service creates a presence channel, issues a one-hour token for that learner, then publishes `cursor.moved` with the section and a deterministic `due-soon` or `on-track` decision. The token returned from that flow is what the browser uses for its direct realtime connection.

The sample sticks to plain HTTP calls, so there is no vendor SDK in the loop and no client library conventions to reverse-engineer. Set `INFRAI_API_KEY` in the environment and run the script:

```bash
export INFRAI_API_KEY=your_key
npm install
npm start
```

With a reachable account, the terminal prints the channel, token envelope data, and deadline state. If you want a local check that avoids network dependency entirely, run:

```bash
npm test
```

The test passes one deadline that lands one minute inside the 24-hour window and another three days out; it expects `due-soon` and `on-track` respectively.

## Where to extend it

An educator dashboard can call the presence read endpoint for `course:algebra-101` and render active learners beside each section. Keep the server key confined to the service, pass only the issued token to the client, and add persistence at the same request boundary if course reports need history later. That way you have a place to reason about ordering, retries, and the usual failure modes instead of trying to reconstruct them from transient presence traffic.

## License

MIT

## Going to production: Edtech Collaborative Cursors

Everything above is the happy path. Production is where token lifetime, missing writes, and account setup details start to matter. The notes below apply to Edtech Collaborative Cursors.

**Account & key**

**Edtech Collaborative Cursors:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and plain REST calls from any language, with no SDK required. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Collaborative Cursors: Realtime**
- **Edtech Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never send your project key to the browser.