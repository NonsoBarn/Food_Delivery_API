"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitialSchema1765977123734 = void 0;
class InitialSchema1765977123734 {
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "users" ...`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
exports.InitialSchema1765977123734 = InitialSchema1765977123734;
//# sourceMappingURL=1765977123734-InitialSchema.js.map