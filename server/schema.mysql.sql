CREATE TABLE IF NOT EXISTS accounts(id CHAR(36) PRIMARY KEY,name VARCHAR(80) NOT NULL,email VARCHAR(254) NOT NULL UNIQUE,password_hash VARCHAR(200) NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token_hash CHAR(64) PRIMARY KEY,user_id CHAR(36) NOT NULL,expires BIGINT NOT NULL,FOREIGN KEY(user_id) REFERENCES accounts(id));
CREATE TABLE IF NOT EXISTS proposals(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,title VARCHAR(100) NOT NULL,purpose VARCHAR(20) NOT NULL,budget INT NOT NULL,notes TEXT NOT NULL,created_at VARCHAR(30) NOT NULL,updated_at VARCHAR(30) NOT NULL,deleted BOOLEAN NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES accounts(id),CHECK(budget>0),INDEX proposals_owner(user_id,deleted));
CREATE TABLE IF NOT EXISTS documents(id CHAR(36) PRIMARY KEY,user_id CHAR(36) NOT NULL,proposal_id CHAR(36) NOT NULL,name VARCHAR(180) NOT NULL,mime VARCHAR(100) NOT NULL,size INT NOT NULL,path VARCHAR(100) NOT NULL UNIQUE,kind VARCHAR(20) NOT NULL,created_at VARCHAR(30) NOT NULL,deleted BOOLEAN NOT NULL DEFAULT 0,FOREIGN KEY(user_id) REFERENCES accounts(id),FOREIGN KEY(proposal_id) REFERENCES proposals(id),INDEX documents_proposal(proposal_id,deleted));
CREATE TABLE IF NOT EXISTS history(id BIGINT PRIMARY KEY AUTO_INCREMENT,user_id CHAR(36) NOT NULL,proposal_id CHAR(36) NOT NULL,action VARCHAR(100) NOT NULL,created_at VARCHAR(30) NOT NULL,FOREIGN KEY(user_id) REFERENCES accounts(id),FOREIGN KEY(proposal_id) REFERENCES proposals(id));
CREATE TABLE IF NOT EXISTS categories(id INT PRIMARY KEY,name VARCHAR(60) NOT NULL UNIQUE);
CREATE TABLE IF NOT EXISTS components(id INT PRIMARY KEY,category_id INT NOT NULL,name VARCHAR(150) NOT NULL,socket VARCHAR(30),memory_type VARCHAR(30),reference_price INT NOT NULL,CHECK(reference_price>=0),FOREIGN KEY(category_id) REFERENCES categories(id));
CREATE TABLE IF NOT EXISTS proposal_components(proposal_id CHAR(36) NOT NULL,component_id INT NOT NULL,quantity INT NOT NULL DEFAULT 1,PRIMARY KEY(proposal_id,component_id),FOREIGN KEY(proposal_id) REFERENCES proposals(id),FOREIGN KEY(component_id) REFERENCES components(id),CHECK(quantity BETWEEN 1 AND 10));
CREATE TABLE IF NOT EXISTS component_details(component_id INT PRIMARY KEY,source_id VARCHAR(150) NOT NULL UNIQUE,summary TEXT NOT NULL,sku VARCHAR(255) NOT NULL,source TEXT,image TEXT,specs JSON NOT NULL,offers JSON NOT NULL,price_min INT,price_max INT,imported_at VARCHAR(30) NOT NULL,FOREIGN KEY(component_id) REFERENCES components(id));
INSERT IGNORE INTO categories VALUES(1,'Procesador'),(2,'Placa base'),(3,'Memoria RAM');
INSERT IGNORE INTO components VALUES
 (1,1,'CPU de ejemplo AM5', 'AM5',NULL,800000),
 (2,2,'Placa de ejemplo AM5 DDR5','AM5','DDR5',600000),
 (3,3,'Kit RAM de ejemplo DDR5',NULL,'DDR5',250000),
 (4,2,'Placa de ejemplo LGA1700 DDR4','LGA1700','DDR4',450000),
 (5,3,'Kit RAM de ejemplo DDR4',NULL,'DDR4',180000);
