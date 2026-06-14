package com.linkito.seguranca;

import com.linkito.limite.LimiteRequisicoesFiltro;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SegurancaConfig {

    private final JwtAutenticacaoFiltro jwtAutenticacaoFiltro;
    private final LimiteRequisicoesFiltro limiteRequisicoesFiltro;

    public SegurancaConfig(JwtAutenticacaoFiltro jwtAutenticacaoFiltro, LimiteRequisicoesFiltro limiteRequisicoesFiltro) {
        this.jwtAutenticacaoFiltro = jwtAutenticacaoFiltro;
        this.limiteRequisicoesFiltro = limiteRequisicoesFiltro;
    }

    @Bean
    public SecurityFilterChain filtroSeguranca(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/register", "/api/auth/login").permitAll()
                        .requestMatchers("/r/**", "/actuator/**", "/error").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);

        http.addFilterBefore(jwtAutenticacaoFiltro, UsernamePasswordAuthenticationFilter.class);
        http.addFilterAfter(limiteRequisicoesFiltro, JwtAutenticacaoFiltro.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder codificadorSenha() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        return username -> {
            throw new UsernameNotFoundException("Usuario nao encontrado");
        };
    }
}
