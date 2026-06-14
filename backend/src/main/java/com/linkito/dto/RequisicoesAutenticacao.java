package com.linkito.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class RequisicoesAutenticacao {
    private static final String EMAIL_PATTERN = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$";

    public static class RequisicaoCadastro {
        @NotBlank(message = "Informe seu nome.")
        public String nome;

        @Email(message = "Informe um email válido.")
        @NotBlank(message = "Informe seu email.")
        @Pattern(regexp = EMAIL_PATTERN, message = "Informe um email válido.")
        public String email;

        @NotBlank(message = "Informe sua senha.")
        @Size(min = 6, message = "A senha deve ter no minimo 6 caracteres.")
        public String senha;
    }

    public static class RequisicaoLogin {
        @Email(message = "Informe um email válido.")
        @NotBlank(message = "Informe seu email.")
        @Pattern(regexp = EMAIL_PATTERN, message = "Informe um email válido.")
        public String email;

        @NotBlank(message = "Informe sua senha.")
        public String senha;
    }
    public static class RequisicaoAtualizarPerfil {
        @NotBlank(message = "Informe seu nome.")
        public String nome;

        @Email(message = "Informe um email valido.")
        @NotBlank(message = "Informe seu email.")
        @Pattern(regexp = EMAIL_PATTERN, message = "Informe um email valido.")
        public String email;
    }

    public static class RequisicaoAlterarSenha {
        @NotBlank(message = "Informe sua senha atual.")
        public String senhaAtual;

        @NotBlank(message = "Informe a nova senha.")
        @Size(min = 6, message = "A nova senha deve ter no minimo 6 caracteres.")
        public String novaSenha;
    }
}
