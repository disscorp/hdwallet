import * as core from "@shapeshiftoss/hdwallet-core"
import { Literal, Object as Obj, Static, Union } from "funtypes";
import { Ed25519 as IotaEd25519 } from "@iota/crypto.js";
//import {FieldElement as IotaFieldElement} from "@iota/crypto.js/src/signatures/edwards25519/fieldElement";
//import {CONST_D as IotaCONST_D} from "@iota/crypto.js/src/signatures/edwards25519/const";
import bigInt, { BigInteger } from "big-integer";

const BN32_ZERO = new Uint8Array(32);

// https://en.wikipedia.org/wiki/EdDSA
// https://safecurves.cr.yp.to/base.html
// https://github.com/paulmillr/noble-ed25519/blob/main/index.ts
// BN32_N = l
const BN32_N = new Uint8Array([
  16, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  20, 222, 249, 222, 162, 247, 156, 214, 88, 18, 99, 26, 92, 245, 211, 237
]);

function cmpBN32(data1: Uint8Array, data2: Uint8Array): number {
  for (let i = 0; i < 32; ++i) {
    if (data1[i] !== data2[i]) {
      return data1[i] < data2[i] ? -1 : 1;
    }
  }
  return 0;
}
class Ed25519 extends IotaEd25519 {
  // https://safecurves.cr.yp.to/base.html
  // https://monerodocs.org/cryptography/asymmetric/edwards25519/
  isPrivate(d: Buffer): boolean {
    return (
      //isUint8Array(x) && // no apply
      d.length === Ed25519.PRIVATE_KEY_SIZE &&
      cmpBN32(d, BN32_ZERO) > 0 &&
      cmpBN32(d, BN32_N) < 0
    )
  }

  /*
  // cannot be rewrote due not official implementation and not consensus between other implementations
  pointCompress(A: Buffer, compressed: boolean): Buffer {

  }

  // https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/edwards.rs#L190
  decompress(bytes: Uint8Array)
  // -> Option<EdwardsPoint> 
  {
    let Y = new IotaFieldElement(); Y.fromBytes(bytes);
    let Z = new IotaFieldElement(); Z.one();
    let YY = new IotaFieldElement(); YY.square(Y);
    let u = new IotaFieldElement(); u.sub(YY,Z);                            // u =  y²-1
    let v = new IotaFieldElement(); v.mul(YY, IotaCONST_D); v.add(v,Z);     // v = dy²+1
    let (is_valid_y_coord, mut X) = FieldElement::sqrt_ratio_i(&u, &v);

    if is_valid_y_coord.unwrap_u8() != 1u8 { return None; }

     // FieldElement::sqrt_ratio_i always returns the nonnegative square root,
     // so we negate according to the supplied sign bit.
    let compressed_sign_bit = Choice::from(self.as_bytes()[31] >> 7);
    X.conditional_negate(compressed_sign_bit);

    Some(EdwardsPoint{ X, Y, Z, T: &X * &Y })
  }
  */
}
/*
class IotaFieldElementExtended extends IotaFieldElement {
  // https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/field.rs#L229
  sqrt_ratio_i(u: IotaFieldElementExtended, v: IotaFieldElementExtended) {
    const v3 = v;
    v3.square(v3);
    v3.mul(v3,v);

    let v7 = v3;
    v7.square(v7);
    v7.mul(v7, v);

    let r = new IotaFieldElementExtended();
    r.mul(u, v7);
    r.pow_p58();
    r
    
    
    r.mul(u, v3);
    


    
    let mut r = &(u * &v3) * &(u * &v7).pow_p58();
    let check = v * &r.square();

    let i = &constants::SQRT_M1;

    let correct_sign_sqrt   = check.ct_eq(        u);
    let flipped_sign_sqrt   = check.ct_eq(     &(-u));
    let flipped_sign_sqrt_i = check.ct_eq(&(&(-u)*i));

    let r_prime = &constants::SQRT_M1 * &r;
    r.conditional_assign(&r_prime, flipped_sign_sqrt | flipped_sign_sqrt_i);

    // Choose the nonnegative square root.
    let r_is_negative = r.is_negative();
    r.conditional_negate(r_is_negative);

    let was_nonzero_square = correct_sign_sqrt | flipped_sign_sqrt;

    (was_nonzero_square, r)
    
  }
  

  /// Compute (self^(2^250-1), self^11), used as a helper function
  /// within invert() and pow22523().
  pow22501(z: IotaFieldElementExtended) {
    // Instead of managing which temporary variables are used
    // for what, we define as many as we need and leave stack
    // allocation to the compiler
    //
    // Each temporary variable t_i is of the form (self)^e_i.
    // Squaring t_i corresponds to multiplying e_i by 2,
    // so the pow2k function shifts e_i left by k places.
    // Multiplying t_i and t_j corresponds to adding e_i + e_j.
    //
    // Temporary t_i                      Nonzero bits of e_i
    //
    let t0  = new IotaFieldElementExtended();
    t0.square(z);                      // 1         e_0 = 2^1
    
    let t1  = new IotaFieldElementExtended();
    t1.square(t0);
    t1.square(t1);                     // 3         e_1 = 2^3

    let t2 = new IotaFieldElementExtended();
    t2.mul(z, t1);                    // 3,0       e_2 = 2^3 + 2^0

    let t3 = new IotaFieldElementExtended();
    t3.mul(t0,t2);                    // 3,1,0
    
    let t4 = new IotaFieldElementExtended();
    t4.square(t3);                    // 4,2,1

    let t5 = new IotaFieldElementExtended();
    t5.mul(t2, t4);                   // 4,3,2,1,0

    let t6 = new IotaFieldElementExtended();
    let t5Bytes: Uint8Array = new Uint8Array();
    t5.toBytes(t5Bytes);
    let t5BytesBN: [BigInteger, BigInteger, BigInteger, BigInteger, BigInteger];
    t5BytesBN[0] = bigInt(t5Bytes[0]);
    t5BytesBN[1] = bigInt(t5Bytes[1]);
    t5BytesBN[2] = bigInt(t5Bytes[2]);
    t5BytesBN[3] = bigInt(t5Bytes[3]);
    t5BytesBN[4] = bigInt(t5Bytes[4]);
    t6.pow2k(t5BytesBN, 5);           // 9,8,7,6,5

    let t7 = new IotaFieldElementExtended();
    t7.mul(t6, t5);                   // 9,8,7,6,5,4,3,2,1,0

    let t8 = new IotaFieldElementExtended();
    t8.pow2k(t7, );


        
    
    let t9  = &t8 * &t7;               // 19..0
    let t10 = t9.pow2k(20);            // 39..20
    let t11 = &t10 * &t9;              // 39..0
    let t12 = t11.pow2k(10);           // 49..10
    let t13 = &t12 * &t7;              // 49..0
    let t14 = t13.pow2k(50);           // 99..50
    let t15 = &t14 * &t13;             // 99..0
    let t16 = t15.pow2k(100);          // 199..100
    let t17 = &t16 * &t15;             // 199..0
    let t18 = t17.pow2k(50);           // 249..50
    let t19 = &t18 * &t13;             // 249..0

    (t19, t3)
  }

  pow_p58() {
    // The bits of (p-5)/8 are 101111.....11.
    //
    //                                 nonzero bits of exponent
    let (t19, _) = this.pow22501();    // 249..0
    let t20 = t19.pow2k(2);            // 251..2
    let t21 = self * &t20;             // 251..2,0

    t21
  }
  
  //https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/backend/serial/u64/field.rs#L445
  static private FE51pow2k(a: [BigInteger, BigInteger, BigInteger, BigInteger, BigInteger] , k: number
    //todo: u32
    ) {

    const m = (x: BigInteger, y: BigInteger): BigInteger => { return x.times(y); };

    while(true) {
      let a3_19 = a[3].times(19);
      let a4_19 = a[4].times(19);

      let c0: BigInteger = m(a[0], a[0]).add( m(a[1], a4_19).add( m(a[2], a3_19).times(2) ) );
      let c1: BigInteger = m(a[3], a3_19).add( m(a[0], a[1]).add( m(a[2], a3_19).times(2) ) );
      let c2: BigInteger = m(a[1], a[1]).add( m(a[0], a[2]).add( m(a[4], a3_19).times(2) ) );
      let c3: BigInteger = m(a[4], a4_19).add( m(a[0], a[3]).add( m(a[1], a[2]).times(2) ) );
      let c4: BigInteger = m(a[2], a[2]).add( m(a[0], a[4]).add( m(a[1], a[3]).times(2) ) );

      const LOW_51_BIT_MASK: BigInteger = bigInt(1).shiftLeft(51).minus(1);

      c1 = c1.add( c0.shiftRight(bigInt(51)) );
      a[0] = c0.and(LOW_51_BIT_MASK);

      c2 = c2.add( c1.shiftRight(bigInt(51)) );
      a[1] = c1.and(LOW_51_BIT_MASK);

      c3 = c3.add( c2.shiftRight(bigInt(51)) );
      a[2] = c2.and(LOW_51_BIT_MASK);

      c4 = c4.add( c3.shiftRight(bigInt(51)) );
      a[3] = c3.and(LOW_51_BIT_MASK);

      let carry: BigInteger = c4.shiftRight(51);
      a[4] = c4.and(LOW_51_BIT_MASK);

      a[0] = a[0].add( (carry.times(bigInt(19))) );

      a[1] = a[1].add( a[0].shiftRight(51) );
      a[0] = a[0].and( LOW_51_BIT_MASK );

      k = k - 1;
      if(k===0)
        break;

    }

    a.forEach((n) => {
      if(n.toString() !== n.toJSNumber().toString()) throw('Precision loss detected');
    });

    return new IotaFieldElementExtended( IotaFieldElementExtended.FE51fromBytes(a) );
  }

  //https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/backend/serial/u64/field.rs#L360
  private toFE51() {

    let data = this.data.slice();

    let fe51: [BigInteger, BigInteger, BigInteger, BigInteger, BigInteger];
    data.forEach((d)=> fe51.push( bigInt(d) ) );

    let limbs = IotaFieldElementExtended.reduce(fe51);

    let q = limbs[0].add(bigInt(19)).shiftRight(51);
    q = limbs[1].add(q).shiftRight(51);
    q = limbs[2].add(q).shiftRight(51);
    q = limbs[3].add(q).shiftRight(51);
    q = limbs[4].add(q).shiftRight(51);


    limbs[0] = limbs[0].add(bigInt(19).times(q));

    const LOW_51_BIT_MASK: BigInteger = bigInt(1).shiftLeft(51).minus(1);

    limbs[1] = limbs[1].add( limbs[0].shiftRight(bigInt(51)) );
    limbs[0] = limbs[0].and(LOW_51_BIT_MASK);
    limbs[2] = limbs[2].add( limbs[1].shiftRight(bigInt(51)) );
    limbs[1] = limbs[1].and(LOW_51_BIT_MASK);
    limbs[3] = limbs[3].add( limbs[2].shiftRight(bigInt(51)) );
    limbs[2] = limbs[2].and(LOW_51_BIT_MASK);
    limbs[4] = limbs[4].add( limbs[3].shiftRight(bigInt(51)) );
    limbs[3] = limbs[3].and(LOW_51_BIT_MASK);

    limbs[4] = limbs[4].and(LOW_51_BIT_MASK);

    let s: Int32Array = new Int32Array(32);
    s[ 0] =   limbs[0] .toJSNumber();
    s[ 1] =  (limbs[0].shiftRight( bigInt(8) ) ).toJSNumber();
    s[ 2] =  (limbs[0].shiftRight( bigInt(16) ) ).toJSNumber();
    s[ 3] =  (limbs[0].shiftRight( bigInt(24) ) ).toJSNumber();
    s[ 4] =  (limbs[0].shiftRight( bigInt(32) ) ).toJSNumber();
    s[ 5] =  (limbs[0].shiftRight( bigInt(40) ) ).toJSNumber();
    s[ 6] = (limbs[0].shiftRight( bigInt(48) ) .or (limbs[1].shiftLeft(bigInt(3))) ).toJSNumber();
    s[ 7] =  (limbs[1].shiftRight( bigInt(5) ) ).toJSNumber();
    s[ 8] =  (limbs[1].shiftRight( bigInt(13) ) ).toJSNumber();
    s[ 9] =  (limbs[1].shiftRight( bigInt(21) ) ).toJSNumber();
    s[10] =  (limbs[1].shiftRight( bigInt(29) ) ).toJSNumber();
    s[11] =  (limbs[1].shiftRight( bigInt(37) ) ).toJSNumber();
    s[12] = (limbs[1].shiftRight( bigInt(45) ) .or (limbs[2].shiftLeft(bigInt(6))) ).toJSNumber();
    s[13] =  (limbs[2].shiftRight( bigInt(2) ) ).toJSNumber();
    s[14] =  (limbs[2].shiftRight( bigInt(10) ) ).toJSNumber();
    s[15] =  (limbs[2].shiftRight( bigInt(18) ) ).toJSNumber();
    s[16] =  (limbs[2].shiftRight( bigInt(26) ) ).toJSNumber();
    s[17] =  (limbs[2].shiftRight( bigInt(34) ) ).toJSNumber();
    s[18] =  (limbs[2].shiftRight( bigInt(42) ) ).toJSNumber();
    s[19] = (limbs[2].shiftRight( bigInt(50) ) .or (limbs[3].shiftLeft(bigInt(1))) ).toJSNumber();
    s[20] =  (limbs[3].shiftRight( bigInt(7) ) ).toJSNumber();
    s[21] =  (limbs[3].shiftRight( bigInt(15) ) ).toJSNumber();
    s[22] =  (limbs[3].shiftRight( bigInt(23) ) ).toJSNumber();
    s[23] =  (limbs[3].shiftRight( bigInt(31) ) ).toJSNumber();
    s[24] =  (limbs[3].shiftRight( bigInt(39) ) ).toJSNumber();
    s[25] = (limbs[3].shiftRight( bigInt(47) ) .or (limbs[4].shiftLeft(bigInt(4))) ).toJSNumber();
    s[26] =  (limbs[4].shiftRight( bigInt(4) ) ).toJSNumber();
    s[27] =  (limbs[4].shiftRight( bigInt(12) ) ).toJSNumber();
    s[28] =  (limbs[4].shiftRight( bigInt(20) ) ).toJSNumber();
    s[29] =  (limbs[4].shiftRight( bigInt(28) ) ).toJSNumber();
    s[30] =  (limbs[4].shiftRight( bigInt(36) ) ).toJSNumber();
    s[31] =  (limbs[4].shiftRight( bigInt(44) ) ).toJSNumber();

    return s;
  }

  static private reduce(limbs: [BigInteger, BigInteger, BigInteger, BigInteger, BigInteger]) {
    const LOW_51_BIT_MASK: BigInteger = bigInt(1).shiftLeft(51).minus(1);

    let c0 = limbs[0].shiftRight(bigInt(51));
    let c1 = limbs[1].shiftRight(bigInt(51));
    let c2 = limbs[2].shiftRight(bigInt(51));
    let c3 = limbs[3].shiftRight(bigInt(51));
    let c4 = limbs[4].shiftRight(bigInt(51));


    limbs[0] = limbs[0].and(LOW_51_BIT_MASK);
    limbs[1] = limbs[1].and(LOW_51_BIT_MASK);
    limbs[2] = limbs[2].and(LOW_51_BIT_MASK);
    limbs[3] = limbs[3].and(LOW_51_BIT_MASK);
    limbs[4] = limbs[4].and(LOW_51_BIT_MASK);

    limbs[0] = limbs[0].add( c4.times( bigInt(19) ) );
    limbs[1] = limbs[1].add( c0 );
    limbs[2] = limbs[2].add( c1 );
    limbs[3] = limbs[3].add( c2 );
    limbs[4] = limbs[4].add( c3 );

    return limbs;
  }

  //https://github.com/dalek-cryptography/curve25519-dalek/blob/3e189820da03cc034f5fa143fc7b2ccb21fffa5e/src/backend/serial/u64/field.rs#L331
  static private FE51fromBytes(bytes: Uint8Array) {
    let load8 = (input: Uint8Array) => {
        return bigInt(input[0])
         .or( bigInt(input[1]).shiftLeft(8) )
         .or( bigInt(input[2]).shiftLeft(16) )
         .or( bigInt(input[3]).shiftLeft(24) )
         .or( bigInt(input[4]).shiftLeft(32) )
         .or( bigInt(input[5]).shiftLeft(40) )
         .or( bigInt(input[6]).shiftLeft(48) )
         .or( bigInt(input[7]).shiftLeft(56) )
    };

    const LOW_51_BIT_MASK: BigInteger = bigInt(1).shiftLeft(51).minus(1);

    
    return (
    // load bits [  0, 64), no shift
    [  load8(bytes.slice()).and(LOW_51_BIT_MASK)
    // load bits [ 48,112), shift to [ 51,112)
    , (load8(bytes.slice(6)).shiftRight(3) ).and(LOW_51_BIT_MASK)
    // load bits [ 96,160), shift to [102,160)
    , (load8(bytes.slice(12)).shiftRight(6) ).and(LOW_51_BIT_MASK)
    // load bits [152,216), shift to [153,216)
    , (load8(bytes.slice(19)).shiftRight(1) ).and(LOW_51_BIT_MASK)
    // load bits [192,256), shift to [204,112)
    , (load8(bytes.slice(20)).shiftRight(2) ).and(LOW_51_BIT_MASK)
    ])
  }
  
}
*/
