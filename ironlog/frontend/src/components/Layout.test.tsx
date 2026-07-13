import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Layout from "./Layout";

describe("root layout scroll contract", () => {
  it("keeps the tab bar outside the only main scroll region", () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/tools"]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/tools" element={<div className="app-page">小工具</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(markup).toContain('data-testid="app-shell"');
    expect(markup).toContain('data-testid="app-main"');
    expect(markup).toContain('data-testid="app-tabbar"');
    expect(markup.indexOf("<main")).toBeLessThan(markup.indexOf("<nav"));
    expect(markup).not.toContain("fixed bottom-0");
  });
});
