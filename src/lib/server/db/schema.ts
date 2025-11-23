import { pgTable, text, timestamp, doublePrecision, json, integer, pgEnum, index, serial } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const facilityTypeEnum = pgEnum('FacilityType', [
  'SPORTS_PLAYGROUND',
  'CHILD_PLAYGROUND',
  'NTO',
  'TOILET',
  'CHILL',
  'CHILDREN_ROOM',
]);

// Tables
export const districts = pgTable('districts', {
  id: serial('id').primaryKey(),
  name: text('name').unique(),
  geometry: json('geometry'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
});

export const parks = pgTable('parks', {
  id: serial('id').primaryKey(),
  name: text('name'),
  description: text('description'),
  geometry: json('geometry'),
  area: doublePrecision('area'),
  balanceHolder: text('balance_holder'),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
  districtId: integer('district_id').references(() => districts.id),
}, (table) => ({
  districtIdIdx: index('parks_district_id_idx').on(table.districtId),
}));

export const facilities = pgTable('facilities', {
  id: serial('id').primaryKey(),
  externalId: text('external_id'),
  name: text('name'),
  type: facilityTypeEnum('type'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  photo: text('photo'),
  description: text('description'),
  area: text('area'),
  mafCount: integer('maf_count'),
  typeCoverage: text('type_coverage'),
  contractAction: text('contract_action'),
  contractWith: text('contract_with'),
  contractTerm: text('contract_term'),
  parkId: integer('park_id').references(() => parks.id),
  createdAt: timestamp('createdAt', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updatedAt', { withTimezone: true }).defaultNow(),
}, (table) => ({
  parkIdIdx: index('facilities_park_id_idx').on(table.parkId),
  typeIdx: index('facilities_type_idx').on(table.type),
}));

// Relations
export const districtsRelations = relations(districts, ({ many }) => ({
  parks: many(parks),
}));

export const parksRelations = relations(parks, ({ one, many }) => ({
  district: one(districts, {
    fields: [parks.districtId],
    references: [districts.id],
  }),
  facilities: many(facilities),
}));

export const facilitiesRelations = relations(facilities, ({ one }) => ({
  park: one(parks, {
    fields: [facilities.parkId],
    references: [parks.id],
  }),
}));
