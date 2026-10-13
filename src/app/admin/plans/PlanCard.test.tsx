import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "@/lib/i18n";
import { PlanCard } from "./PlanCard";

const starter = { postLimit: 10, expiryDays: 30, boost: false, companyFeatures: false };

function renderCard(onSave = vi.fn().mockResolvedValue(undefined)) {
    render(
        <LocaleProvider>
            <PlanCard plan="starter" name="Starter" saved={starter} onSave={onSave} />
        </LocaleProvider>
    );
    return onSave;
}

describe("PlanCard", () => {
    afterEach(cleanup);

    it("only enables saving once something changed", () => {
        renderCard();
        const save = screen.getByRole("button", { name: /save/i }) as HTMLButtonElement;
        expect(save.disabled).toBe(true);

        fireEvent.change(screen.getByLabelText(/active posts/i), { target: { value: "25" } });
        expect(save.disabled).toBe(false);
    });

    it("saves an unlimited post limit as null", async () => {
        const onSave = renderCard();

        fireEvent.click(screen.getByRole("checkbox", { name: /unlimited/i }));
        fireEvent.click(screen.getByRole("checkbox", { name: /boost/i }));
        fireEvent.click(screen.getByRole("button", { name: /save/i }));

        await waitFor(() =>
            expect(onSave).toHaveBeenCalledWith("starter", { postLimit: null, expiryDays: 30, boost: true, companyFeatures: false })
        );
    });

    it("blocks out-of-range values", () => {
        renderCard();

        fireEvent.change(screen.getByLabelText(/stay live/i), { target: { value: "0" } });

        expect(screen.getByRole("alert")).toBeTruthy();
        expect((screen.getByRole("button", { name: /save/i }) as HTMLButtonElement).disabled).toBe(true);
    });
});
