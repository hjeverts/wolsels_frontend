export interface Wool {
  id: number;
  name: string;
  woolType: string;
  color: string;
  colorHex: string | null;
  weightGrams: number;
  origin: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type WoolRequest = Omit<Wool, 'id' | 'createdAt' | 'updatedAt'>;

export type CalculationBasis = 'TotalWeight' | 'ComponentWeight';
export type BlendStatus = 'Planned' | 'Spun';
export type SpinDirection = 'S' | 'Z';

export interface BlendComponent {
  woolId: number;
  woolName: string;
  woolType: string;
  color: string;
  colorHex: string | null;
  ratio: number;
  percentage: number;
  weightGrams: number;
}

export interface SpinningResult {
  spunOn: string | null;
  outputWeightGrams: number | null;
  outputLengthMeters: number | null;
  yarnWeight: string | null;
  wrapsPerInch: number | null;
  plyCount: number | null;
  plyMethod: string | null;
  spinDirection: SpinDirection | null;
  isDyed: boolean;
  dyeColor: string | null;
  dyeColorHex: string | null;
  dyeProduct: string | null;
  dyeMethod: string | null;
}

export interface Blend extends SpinningResult {
  id: number;
  name: string;
  status: BlendStatus;
  basis: CalculationBasis;
  basisComponentIndex: number | null;
  inputWeightGrams: number;
  yieldPercentage: number | null;
  notes: string | null;
  components: BlendComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface BlendRequest extends SpinningResult {
  name: string;
  status: BlendStatus;
  notes: string | null;
  components: { woolId: number; ratio: number }[];
  basis: CalculationBasis;
  totalWeightGrams: number | null;
  basisComponentIndex: number | null;
  basisComponentWeightGrams: number | null;
}

export interface Settings {
  maxBlendComponents: number;
}

export interface Location {
  id: number;
  name: string;
  notes: string | null;
  animalCount: number;
}

export type LocationRequest = Pick<Location, 'name' | 'notes'>;

export interface Animal {
  id: number;
  name: string;
  species: string;
  breed: string | null;
  color: string | null;
  birthDate: string | null;
  locationId: number | null;
  locationName: string | null;
  active: boolean;
  notes: string | null;
  totalHarvestedGrams: number;
  lastHarvestDate: string | null;
}

export type AnimalRequest = Omit<Animal, 'id' | 'locationName' | 'totalHarvestedGrams' | 'lastHarvestDate'>;

export interface Harvest {
  id: number;
  date: string;
  animalId: number | null;
  animalName: string | null;
  locationId: number | null;
  locationName: string | null;
  weightGrams: number;
  method: string | null;
  grade: string | null;
  woolId: number | null;
  notes: string | null;
}

export interface HarvestRequest {
  date: string;
  animalId: number | null;
  locationId: number | null;
  weightGrams: number;
  method: string | null;
  grade: string | null;
  notes: string | null;
  addToStock: boolean;
}

export interface ProductionSummary {
  totalGrams: number;
  harvestCount: number;
  perMonth: { year: number; month: number; totalGrams: number; harvestCount: number }[];
  perSource: { kind: 'animal' | 'location'; id: number; name: string; totalGrams: number; harvestCount: number }[];
}
