import json, os, sys, urllib.parse, urllib.request

token_raw = os.environ.get("GDRIVE_TOKEN_JSON", "").strip()
if not token_raw:
    print("No GDRIVE_TOKEN_JSON secret set, skipping Drive upload.")
    sys.exit(0)

t = json.loads(token_raw)
tok = t.get("token") or t.get("access_token")
if t.get("refresh_token") and t.get("client_id") and t.get("client_secret"):
    data = urllib.parse.urlencode({
        "client_id": t["client_id"],
        "client_secret": t["client_secret"],
        "refresh_token": t["refresh_token"],
        "grant_type": "refresh_token",
    }).encode()
    tok = json.loads(urllib.request.urlopen(urllib.request.Request("https://oauth2.googleapis.com/token", data=data)).read())["access_token"]

out_path = sys.argv[1]
name = os.path.basename(out_path)
meta = {"name": name}
if os.environ.get("GDRIVE_FOLDER_ID"):
    meta["parents"] = [os.environ["GDRIVE_FOLDER_ID"]]

b = "----RemotionDriveBoundary"
body = (
    f"--{b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n{json.dumps(meta)}\r\n"
    f"--{b}\r\nContent-Type: video/mp4\r\n\r\n"
).encode() + open(out_path, "rb").read() + f"\r\n--{b}--\r\n".encode()

req = urllib.request.Request(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    data=body,
    headers={"Authorization": f"Bearer {tok}", "Content-Type": f"multipart/related; boundary={b}"},
)
print(urllib.request.urlopen(req).read().decode())
