import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { ThemeToggle } from "@/components/shell/theme-toggle";

function renderThemeToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("reflects the current root theme and toggles it persistently", async () => {
    document.documentElement.dataset.theme = "dark";
    document.documentElement.style.colorScheme = "dark";
    window.localStorage.clear();

    renderThemeToggle();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Toggle application theme" })).toHaveTextContent(
        "Dark mode",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Toggle application theme" }));

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-theme", "light");
      expect(document.documentElement.style.colorScheme).toBe("light");
      expect(window.localStorage.getItem("mine-pile-viz-theme")).toBe("light");
      expect(screen.getByRole("button", { name: "Toggle application theme" })).toHaveTextContent(
        "Light mode",
      );
    });
  });

  it("adopts the root light theme during hydration", async () => {
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";

    renderThemeToggle();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Toggle application theme" })).toHaveTextContent(
        "Light mode",
      );
    });
  });
});
