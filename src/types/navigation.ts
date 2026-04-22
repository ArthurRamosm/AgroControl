export type AnimalParams = {
  id: number;
  brinco: string;
  nome?: string | null;
  raca: string;
  sexo: 'M' | 'F';
  tipo: string;
  statusLeite: string;
  ativo: boolean;
};

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  AnimalList: undefined;
  CadastroAnimal: { animal?: AnimalParams } | undefined;
};
