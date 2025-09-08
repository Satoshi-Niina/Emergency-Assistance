ALTER TABLE "emergency_flows" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "support_flows" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "emergency_flows" CASCADE;--> statement-breakpoint
DROP TABLE "support_flows" CASCADE;--> statement-breakpoint
ALTER TABLE "support_history" ADD COLUMN "machine_type_id" text;--> statement-breakpoint
ALTER TABLE "support_history" ADD COLUMN "machine_id" text;--> statement-breakpoint
ALTER TABLE "support_history" ADD CONSTRAINT "support_history_machine_type_id_machine_types_id_fk" FOREIGN KEY ("machine_type_id") REFERENCES "public"."machine_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_history" ADD CONSTRAINT "support_history_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE no action ON UPDATE no action;