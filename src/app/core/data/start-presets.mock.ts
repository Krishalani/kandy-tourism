import { StartPreset } from '../models/trip-plan.model';

/** PROTOTYPE DATA: predefined starting points. */
export const MOCK_START_PRESETS: StartPreset[] = [
  {
    id: 'kandy-city-centre',
    label: 'Kandy City Centre',
    description: 'Clock Tower, in the heart of town',
    latitude: 7.2931,
    longitude: 80.6347,
    coordinatesApproximate: false,
  },
  {
    id: 'kandy-railway-station',
    label: 'Kandy Railway Station',
    description: 'Convenient if you arrive by train',
    latitude: 7.2902,
    longitude: 80.6325,
    coordinatesApproximate: true,
  },
];

export const DEFAULT_START_PRESET_ID = 'kandy-city-centre';

/** PROTOTYPE DATA: example day offered from the empty My Plan page, in visiting order. */
export const MOCK_SAMPLE_ITINERARY_IDS: readonly string[] = [
  'att-002', // Kandy Lake
  'att-001', // Temple of the Sacred Tooth Relic
  'att-004', // Bahirawakanda Buddha Statue
  'att-003', // Royal Botanical Gardens, Peradeniya
];
