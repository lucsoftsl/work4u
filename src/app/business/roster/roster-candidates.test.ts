import { describe, expect, it } from "vitest";

import type { WorkerListing } from "@/api/types";
import { groupListingsByWorker } from "./roster-candidates";

const listing = (id: string, workerId: string, category: string) => ({ id, workerId, category }) as WorkerListing;

describe("groupListingsByWorker", () => {
    it("shows a worker with several listings once, keeping first-seen order", () => {
        const result = groupListingsByWorker([
            listing("l1", "olivier", "Tutoring"),
            listing("l2", "sofia", "Pet care"),
            listing("l3", "olivier", "Tutoring"),
            listing("l4", "olivier", "Music lessons"),
        ]);

        expect(result.map((c) => c.workerId)).toEqual(["olivier", "sofia"]);
        expect(result[0].listing.id).toBe("l1");
        expect(result[0].categories).toEqual(["Tutoring", "Music lessons"]);
    });

    it("keeps different accounts apart even when their names match", () => {
        expect(groupListingsByWorker([listing("a", "olivier-v6", "Tutoring"), listing("b", "olivier-v7", "Tutoring")])).toHaveLength(2);
    });
});
