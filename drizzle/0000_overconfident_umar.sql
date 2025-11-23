CREATE TYPE "public"."FacilityType" AS ENUM('SPORTS_PLAYGROUND', 'CHILD_PLAYGROUND', 'NTO', 'TOILET', 'CHILL', 'CHILDREN_ROOM');--> statement-breakpoint
CREATE TABLE "districts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"geometry" json,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "districts_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"external_id" text,
	"name" text,
	"type" "FacilityType",
	"latitude" double precision,
	"longitude" double precision,
	"photo" text,
	"description" text,
	"area" text,
	"maf_count" integer,
	"type_coverage" text,
	"contract_action" text,
	"contract_with" text,
	"contract_term" text,
	"park_id" integer,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "parks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"description" text,
	"geometry" json,
	"area" double precision,
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	"district_id" integer
);
--> statement-breakpoint
ALTER TABLE "facilities" ADD CONSTRAINT "facilities_park_id_parks_id_fk" FOREIGN KEY ("park_id") REFERENCES "public"."parks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parks" ADD CONSTRAINT "parks_district_id_districts_id_fk" FOREIGN KEY ("district_id") REFERENCES "public"."districts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "facilities_park_id_idx" ON "facilities" USING btree ("park_id");--> statement-breakpoint
CREATE INDEX "facilities_type_idx" ON "facilities" USING btree ("type");--> statement-breakpoint
CREATE INDEX "parks_district_id_idx" ON "parks" USING btree ("district_id");