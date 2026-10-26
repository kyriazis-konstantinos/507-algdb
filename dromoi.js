// Εργαστήριο 4, μάθημα 507: δέκα δρόμοι γύρω από το campus (ΕΓΣΑ87, μέτρα)
// Κάθε δρόμος: όνομα, σημεία [X, Y] από την αρχή ως το τέλος και μονόδρομος.
const ANOCHI_METRA = 0.5;

const dromoi = [
  { onoma: "Τ1", simeia: [[456000, 4553000], [456120, 4553000]], monodromos: false },
  { onoma: "Τ2", simeia: [[456120, 4553000], [456250, 4553000]], monodromos: true },
  { onoma: "Τ3", simeia: [[456000, 4553000], [456000, 4553090]], monodromos: false },
  { onoma: "Τ4", simeia: [[456120, 4553000], [456120, 4553090]], monodromos: false },
  { onoma: "Τ5", simeia: [[456000, 4553090], [456060, 4553110], [456120, 4553090]], monodromos: false },
  { onoma: "Τ6", simeia: [[456120, 4553090], [456250, 4553090.3]], monodromos: false },
  { onoma: "Τ7", simeia: [[456250, 4553000], [456250, 4553090]], monodromos: false },
  { onoma: "Τ8", simeia: [[456120, 4553090], [456120, 4553170]], monodromos: false },
  { onoma: "Τ9", simeia: [[456400, 4553050], [456480, 4553050]], monodromos: false },
  { onoma: "Τ10", simeia: [[456480, 4553050], [456480, 4553120]], monodromos: false },
];