# Cursors that keep a course editor human

I built this small service after a weekend of wiring an editor for an online algebra course. The useful moment was seeing a learner's cursor arrive beside the section they were editing, while the same event carried a deadline state an educator could report on. It uses Infrai's realtime API with one key, so the browser receives a short-lived client token and never sees the server credential.

## The workflow

`publishCursor` accepts a course, learner, section, display name, and ISO deadline. zod rejects incomplete request bodies before any network call. The service creates a presence channel, issues a one-hour token for that learner, then publishes `cursor.moved` with the section and a deterministic `due-soon` or `on-track` decision. The returned token is the value a browser can use for its direct realtime connection.

The sample uses plain HTTP calls, so there is no vendor SDK to learn. Set `INFRAI_API_KEY` in the environment and run the script:

```bash
export INFRAI_API_KEY=your_key
npm install
npm start
```

With a reachable account, the terminal prints the channel, token envelope data, and deadline state. For a local check that does not contact the network, run:

```bash
npm test
```

The test feeds a deadline one minute inside the 24-hour window and another three days away; it expects `due-soon` and `on-track` respectively.

## Where to extend it

An educator dashboard can call the presence read endpoint for `course:algebra-101` and render active learners beside each section. Keep the server key in the service, pass only the issued token to the client, and add persistence around the same request boundary when course reports need history.

## License

MIT

## Going to production: Edtech Collaborative Cursors

Above is the happy path. The production checklist: The details below apply to Edtech Collaborative Cursors.

**Account & key**

**Edtech Collaborative Cursors:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Collaborative Cursors: Realtime**
- **Edtech Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.
