"""Single-server mode: the built frontend's routes reload and deep-link correctly."""

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.main import mount_frontend


def make_client(tmp_path):
    dist = tmp_path / "dist"
    (dist / "assets").mkdir(parents=True)
    (dist / "samples").mkdir()
    (dist / "index.html").write_text("<!doctype html><title>NutriScan AI</title><div id=root></div>", encoding="utf-8")
    (dist / "assets" / "app.js").write_text("console.log(1)", encoding="utf-8")
    (dist / "samples" / "idli.txt").write_text("sample", encoding="utf-8")
    (tmp_path / "secret.txt").write_text("outside dist", encoding="utf-8")

    app = FastAPI()

    @app.get("/api/health")
    def health():
        return {"status": "ok"}

    mount_frontend(app, dist)
    return TestClient(app)


def test_app_routes_serve_index_html(tmp_path):
    client = make_client(tmp_path)
    for path in ["/", "/scan", "/dashboard", "/dietplan", "/profile/edit/2", "/login", "/no-such-page"]:
        res = client.get(path)
        assert res.status_code == 200 and "<div id=root>" in res.text, path
        assert res.headers["content-type"].startswith("text/html")


def test_real_files_are_served_as_themselves(tmp_path):
    client = make_client(tmp_path)
    assert client.get("/assets/app.js").text == "console.log(1)"
    assert client.get("/samples/idli.txt").text == "sample"


def test_api_paths_and_traversal_do_not_fall_back_to_the_app(tmp_path):
    client = make_client(tmp_path)
    assert client.get("/api/health").json() == {"status": "ok"}
    missing = client.get("/api/nope")
    assert missing.status_code == 404 and missing.json() == {"detail": "Not Found"}
    # A path escaping dist must not read files outside it; it just gets the app shell.
    res = client.get("/samples/../../secret.txt")
    assert "outside dist" not in res.text
