import * as ethers from 'ethers';

const addr = '0x833589fCD6eDb6E08f4c7C32D4f71b3566dA8860';
const checksummed = ethers.getAddress(addr);
console.log('Original:  ', addr);
console.log('Checksummed:', checksummed);
console.log('Match:     ', addr === checksummed ? 'Same' : 'Different');
