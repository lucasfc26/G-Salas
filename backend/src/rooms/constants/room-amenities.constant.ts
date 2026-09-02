/// Fixed catalog of amenity tags an admin can toggle on/off for a room.
/// Kept in sync by hand with frontend/src/data/room-amenities.ts — there is
/// no shared package between the two apps.
export const ROOM_AMENITIES = [
  'Wi-Fi',
  'Ar-condicionado',
  'TV / Monitor',
  'Projetor',
  'Quadro branco',
  'Mesa de reunião',
  'Cadeiras extras',
  'Acessibilidade (PCD)',
  'Isolamento acústico',
  'Iluminação natural',
  'Banheiro privativo',
  'Copa / Cozinha',
  'Estacionamento',
  'Sistema de som',
] as const;

export type RoomAmenity = (typeof ROOM_AMENITIES)[number];
