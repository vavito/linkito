package com.linkito.autenticacao;

import com.linkito.dto.RequisicoesAutenticacao;
import com.linkito.dto.RespostaErro;
import com.linkito.dto.RespostasAutenticacao;
import com.linkito.seguranca.JwtUtil;
import com.linkito.servico.UsuarioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AutenticacaoController {

    private final UsuarioService usuarioService;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder codificadorSenha;

    public AutenticacaoController(UsuarioService usuarioService, JwtUtil jwtUtil, PasswordEncoder codificadorSenha) {
        this.usuarioService = usuarioService;
        this.jwtUtil = jwtUtil;
        this.codificadorSenha = codificadorSenha;
    }

    @PostMapping("/register")
    public ResponseEntity<?> cadastrar(@Valid @RequestBody RequisicoesAutenticacao.RequisicaoCadastro requisicao) {
        if (usuarioService.buscarPorEmail(requisicao.email).isPresent()) {
            return ResponseEntity.badRequest().body(new RespostaErro("Email já está em uso"));
        }

        var usuarioCriado = usuarioService.cadastrar(requisicao.nome, requisicao.email, requisicao.senha);
        return ResponseEntity.ok(new RespostasAutenticacao.RespostaCadastro(
                usuarioCriado.getId(),
                usuarioCriado.getNome(),
                usuarioCriado.getEmail()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody RequisicoesAutenticacao.RequisicaoLogin requisicao) {
        var usuarioOpt = usuarioService.buscarPorEmail(requisicao.email);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(401).body("credenciais-invalidas");
        }

        var usuario = usuarioOpt.get();
        if (!codificadorSenha.matches(requisicao.senha, usuario.getSenhaHash())) {
            return ResponseEntity.status(401).body("credenciais-invalidas");
        }

        String token = jwtUtil.gerarToken(usuario.getId().toString());
        return ResponseEntity.ok(new RespostasAutenticacao.RespostaLogin(token));
    }

    @GetMapping("/me")
    public ResponseEntity<?> perfil() {
        UUID usuarioId = buscarUsuarioAtualId();
        return usuarioService.buscarPorId(usuarioId)
                .map(usuario -> ResponseEntity.ok(new RespostasAutenticacao.RespostaPerfil(
                        usuario.getId(),
                        usuario.getNome(),
                        usuario.getEmail(),
                        usuario.getPerfil())))
                .orElseGet(() -> ResponseEntity.status(401).build());
    }

    @PutMapping("/me")
    public ResponseEntity<?> atualizarPerfil(@Valid @RequestBody RequisicoesAutenticacao.RequisicaoAtualizarPerfil requisicao) {
        UUID usuarioId = buscarUsuarioAtualId();
        var usuarioComEmail = usuarioService.buscarPorEmail(requisicao.email);
        if (usuarioComEmail.isPresent() && !usuarioComEmail.get().getId().equals(usuarioId)) {
            return ResponseEntity.badRequest().body(new RespostaErro("Email ja esta em uso"));
        }

        return usuarioService.atualizarPerfil(usuarioId, requisicao.nome, requisicao.email)
                .map(usuario -> ResponseEntity.ok(new RespostasAutenticacao.RespostaPerfil(
                        usuario.getId(),
                        usuario.getNome(),
                        usuario.getEmail(),
                        usuario.getPerfil())))
                .orElseGet(() -> ResponseEntity.status(401).build());
    }

    @PutMapping("/password")
    public ResponseEntity<?> alterarSenha(@Valid @RequestBody RequisicoesAutenticacao.RequisicaoAlterarSenha requisicao) {
        UUID usuarioId = buscarUsuarioAtualId();
        var usuarioOpt = usuarioService.buscarPorId(usuarioId);
        if (usuarioOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        var usuario = usuarioOpt.get();
        if (!codificadorSenha.matches(requisicao.senhaAtual, usuario.getSenhaHash())) {
            return ResponseEntity.badRequest().body(new RespostaErro("Senha atual invalida"));
        }

        usuarioService.alterarSenha(usuario, requisicao.novaSenha);
        return ResponseEntity.noContent().build();
    }

    private UUID buscarUsuarioAtualId() {
        var autenticacao = SecurityContextHolder.getContext().getAuthentication();
        if (autenticacao != null && autenticacao.getPrincipal() instanceof UUID usuarioId) {
            return usuarioId;
        }
        throw new IllegalStateException("Usuario autenticado nao encontrado");
    }
}
