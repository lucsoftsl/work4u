import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UsersToolbar, type UserFilters } from "./users-toolbar";

const base: UserFilters = { q: "", status: "", userType: "", sort: "joined_desc" };

describe("UsersToolbar", () => {
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("commits the search after the user stops typing", () => {
        vi.useFakeTimers();
        const onChange = vi.fn();
        render(<UsersToolbar filters={base} onChange={onChange} />);

        fireEvent.change(screen.getByRole("searchbox"), { target: { value: "  mlacif1@gmail.com " } });
        expect(onChange).not.toHaveBeenCalled();

        act(() => vi.advanceTimersByTime(300));
        expect(onChange).toHaveBeenCalledWith({ q: "mlacif1@gmail.com" });
    });

    it("applies status, type and sort changes immediately", () => {
        const onChange = vi.fn();
        render(<UsersToolbar filters={base} onChange={onChange} />);
        const [status, type, sort] = screen.getAllByRole("combobox");

        fireEvent.change(status, { target: { value: "SUSPENDED" } });
        fireEvent.change(type, { target: { value: "ADMIN" } });
        fireEvent.change(sort, { target: { value: "joined_asc" } });

        expect(onChange.mock.calls).toEqual([[{ status: "SUSPENDED" }], [{ userType: "ADMIN" }], [{ sort: "joined_asc" }]]);
    });
});
