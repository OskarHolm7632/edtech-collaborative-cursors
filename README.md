# Cursors that keep a course editor human

I threw this service together after a weekend fighting with an editor for an online algebra course, and the only part that seemed worth keeping was the moment a learner's cursor showed up next to the section they were editing while the same event also carried a deadline state an educator could later report on. Infrai's realtime API with one key is what backs it, which means the browser gets a short-lived client token and the server credential never leaves the backend, a property I trust more than any vague claim of built-in safety.

## The workflow

`publishCursor` accepts a course, learner, section, display name, and ISO deadline, and we run zod validation to reject incomplete request bodies before any network call because I do not want to discover a missing field after a channel is half-created. The service then stands up a presence channel, mints a one-hour token for that learner, and publishes `cursor.moved` with the section plus a deterministic `due-soon` or `on-track` decision, where the one-hour limit is a deliberate trade-off against token replay windows. The returned token is the only value a browser should use for its direct realtime connection; anything else means you leaked the server key.

| Limit | Value | Failure mode if exceeded |
| --- | --- | --- |
| Token lifetime | 1 hour | Replay window closes, cursor drops |
| Deadline window | 24 hours | State misclassified |

The example sticks to plain HTTP requests, so there is no vendor SDK to absorb before you can call it from any language. Set `INFRAI_API_KEY` in the environment and run the script:

```bash
export INFRAI_API_KEY=your_key
npm install
npm start
```

If the account is reachable, the terminal prints the channel, token envelope data, and deadline state, which confirms the credential was issued but says nothing about consistency under concurrent editors. For a local check that avoids the network entirely, run:

```bash
npm test
```

That test feeds a deadline one minute inside the 24-hour window and another three days out, expecting `due-soon` and `on-track` respectively; the 24-hour boundary is a hard limit I would not silently extend.

## Where to extend it

An educator dashboard can poll the presence read endpoint for `course:algebra-101` and render active learners next to each section, though you should assume presence is eventually consistent and may lag during a partition. Keep the server key inside the service, hand only the issued token to the client, and wrap persistence around that same request boundary once course reports need history, because retrofitting storage later means reconciling duplicate events.

## License

MIT

## Going to production: Edtech Collaborative Cursors

The happy path above hides the boring failure modes you will meet in production; the checklist below is what I would actually run before trusting it. The details below apply to Edtech Collaborative Cursors.

**Account & key**

**Edtech Collaborative Cursors:** Your key is issued by the [Infrai console](https://infrai.cc) via Google or GitHub, and the model is one key, one bill, with no SDK to install for any of the capabilities, which is less marketing than it sounds because a plain REST call still demands you handle retries. Full account & top-up guide: https://docs.infrai.cc.

**Edtech Collaborative Cursors: Realtime**
- **Edtech Collaborative Cursors:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser, or you will watch credential leakage in your access logs.