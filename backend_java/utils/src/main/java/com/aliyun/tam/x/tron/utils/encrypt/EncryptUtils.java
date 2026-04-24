/*
 * Copyright 2026 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


package com.aliyun.tam.x.tron.utils.encrypt;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.*;
import javax.crypto.spec.SecretKeySpec;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

@Component
public class EncryptUtils {
    private static final String DEFAULT_SECRET_KEY = "xqmb5gbSExLys4JNSScTPgkww0bOmU+Ns+Cmxw7x4/U=";

    private static volatile Environment environment;

    private static volatile SecretKey secretKey;

    private static SecretKey getSecretKey() throws NoSuchAlgorithmException {
        if (secretKey == null) {
            synchronized (EncryptUtils.class) {
                if (secretKey == null) {
                    String key = environment.getProperty("tron.encrypt.key", DEFAULT_SECRET_KEY);
                    if (key.isBlank()) {
                        key = DEFAULT_SECRET_KEY;
                    }
                    secretKey = new SecretKeySpec(Base64.getDecoder().decode(key), "AES");
                }
            }
        }
        return secretKey;
    }

    public static String encrypt(String data) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.ENCRYPT_MODE, getSecretKey());
            return Base64.getEncoder().encodeToString(cipher.doFinal(data.getBytes()));
        } catch (NoSuchPaddingException | IllegalBlockSizeException | NoSuchAlgorithmException | BadPaddingException |
                 InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }

    public static String decrypt(String data) {
        try {
            Cipher cipher = Cipher.getInstance("AES");
            cipher.init(Cipher.DECRYPT_MODE, getSecretKey());
            return new String(cipher.doFinal(Base64.getDecoder().decode(data)));
        } catch (NoSuchPaddingException | IllegalBlockSizeException | NoSuchAlgorithmException | BadPaddingException |
                 InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }

    public static String newSecretKey() throws NoSuchAlgorithmException {
        KeyGenerator keyGen = KeyGenerator.getInstance("AES");
        keyGen.init(256); // 指定密钥长度为 256 位
        SecretKey key = keyGen.generateKey();
        return Base64.getEncoder().encodeToString(key.getEncoded());
    }

    @Autowired
    public void setEnvironment(Environment environment) {
        EncryptUtils.environment = environment;
    }

    public static void main(String[] args) throws Exception {
        System.out.println(newSecretKey());
    }
}
