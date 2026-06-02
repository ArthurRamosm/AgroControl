import { AnimalParams } from '../types/navigation';

export function formatarDataBrasileira(valor: string) {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);
  if (numeros.length <= 4) return numeros;
  if (numeros.length <= 6) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`;
}

export function validarDataCompleta(valor: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor.trim());
  if (!match) return false;
  const dia = Number(match[1]);
  const mes = Number(match[2]);
  const ano = Number(match[3]);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

export function dataBrParaApi(valor: string) {
  const [dia, mes, ano] = valor.split('/');
  return `${ano}-${mes}-${dia}`;
}

export function idadeAnimal(animal: Pick<AnimalParams, 'dataNascimento' | 'dataNascimentoInformada'>) {
  const hoje = new Date();
  const informada = animal.dataNascimentoInformada?.trim();

  if (informada && /^\d{4}$/.test(informada)) {
    return `aprox. ${Math.max(0, hoje.getFullYear() - Number(informada))} anos`;
  }

  const data = obterDataNascimento(animal);
  if (!data) return 'Nao informada';

  let meses = (hoje.getFullYear() - data.getFullYear()) * 12 + hoje.getMonth() - data.getMonth();
  if (hoje.getDate() < data.getDate()) meses--;
  meses = Math.max(0, meses);

  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anos <= 0) return `${resto} meses`;
  if (resto === 0) return `${anos} anos`;
  return `${anos} anos e ${resto} meses`;
}

function obterDataNascimento(animal: Pick<AnimalParams, 'dataNascimento' | 'dataNascimentoInformada'>) {
  const informada = animal.dataNascimentoInformada?.trim();
  if (informada && /^\d{2}\/\d{2}\/\d{4}$/.test(informada)) {
    const [dia, mes, ano] = informada.split('/').map(Number);
    return new Date(ano, mes - 1, dia);
  }

  if (!animal.dataNascimento) return null;
  const [ano, mes, dia] = animal.dataNascimento.slice(0, 10).split('-').map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}
