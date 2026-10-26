import { RepositorioCredencial } from "../repositories/RepositorioCredencial";
import { Credencial } from "../domain/entities/Credencial";
import { PapelUsuario } from "../domain/enums/PapelUsuario";
import { NaoAutorizadoError, RequisicaoInvalidaError } from "../domain/errors/AppError";

export class ServicoAutenticacao {
  constructor(private repoCredencial: RepositorioCredencial = new RepositorioCredencial()) {}

  async autenticar(usuario: string, senha: string) {
    if (!usuario || !senha) {
      throw new RequisicaoInvalidaError("Usuário e senha são obrigatórios.");
    }

    const registro = await this.repoCredencial.buscarPorUsuario(usuario);
    if (!registro || !registro.ativo) {
      throw new NaoAutorizadoError("Credenciais inválidas ou conta inativa.");
    }

    const credencial = new Credencial(
      registro.id,
      registro.usuario,
      registro.hashSenha,
      registro.papel,
      registro.ativo,
      registro.ultimoAcesso,
      registro.salt
    );

    const senhaValida = await credencial.autenticar(senha);
    if (!senhaValida) {
      throw new NaoAutorizadoError("Credenciais inválidas.");
    }

    await this.repoCredencial.atualizarUltimoAcesso(registro.id);

    return {
      id: registro.id,
      usuario: registro.usuario,
      papel: registro.papel
    };
  }

  async cadastrarUsuario(usuario: string, senha: string, papel: PapelUsuario) {
    if (!usuario || usuario.trim().length < 3) {
      throw new RequisicaoInvalidaError("Nome de usuário deve ter no mínimo 3 caracteres.");
    }
    if (!senha || senha.length < 6) {
      throw new RequisicaoInvalidaError("A senha deve ter no mínimo 6 caracteres.");
    }
    if (!Object.values(PapelUsuario).includes(papel)) {
      throw new RequisicaoInvalidaError("Papel de usuário inválido.");
    }

    const hashSenha = await Credencial.gerarHash(senha);
    const novo = await this.repoCredencial.criar({
      usuario: usuario.trim(),
      hashSenha,
      papel
    });

    return {
      id: novo.id,
      usuario: novo.usuario,
      papel: novo.papel,
      ativo: novo.ativo,
      criadoEm: novo.criadoEm
    };
  }

  async listarUsuarios() {
    const lista = await this.repoCredencial.listar();
    return lista.map((u) => ({
      id: u.id,
      usuario: u.usuario,
      papel: u.papel,
      ativo: u.ativo,
      ultimoAcesso: u.ultimoAcesso,
      criadoEm: u.criadoEm
    }));
  }
}
