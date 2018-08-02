var array = [1000,22000,3000,5,1,2,3,4];

// for (let i = 0, p = Promise.resolve(); i < array.length; i++) {
//     p = p.then((output) => new Promise(resolve =>{
//         console.log(output);
//         processNumber(array[i],resolve)
//     }
//     ));
// }

let p = Promise.resolve();
array.forEach((number) =>{
    p = p.then(() => new Promise(resolve =>{
        console.log(number);
        processNumber(number,resolve)
    }
    ));
    console.log("I am done");
});



// async function process(){

//     return new Promise((resolve,reject) => {
//         resolve()
//     });

//     array.forEach((number) => {
//         await processNumber(number).then((output) => {
//             console.log(output);
//         });
//     });

    
// }

function processNumber(number,resolve){
    
        setTimeout( () => resolve(2),number);
    
}

// process();

// output = array.reduce((previous,current) => {
//     return previous + current;
// });

// console.log(output);


// array.reduce((p,current) => {
    

    
//         p.then(() => {
//             // console.log("I am inside");
//             return new Promise((resolve,reject) => {
//                 //actual execution;
//                 let j = 1;
//                 for (let i = 0; i <= current;i++){
//                     j = j * i;
//                 }
    
//                 for (let i = 1; i <= current;i++){
//                     j = j * i;
//                 }
    
//                 for (let i = 1; i <= current;i++){
//                     j = j * i;
//                 }
//                 console.log("finished executing 2 ",current);
//                 resolve();
//             });
//         })
    

// }, new Promise((res,rej)=>
// { res(0) }));

// async function fWithAwait(){
//     let promise = new Promise((resolve,reject) => {
//         setTimeout (() => resolve("done!"),1000)
//     });

//     let result = await promise; //this line will be on hold untile promise is resolved


//     console.log(result);
// }

// function fWithThen(){
//     let promise = new Promise((resolve,reject) => {
//         setTimeout (() => resolve("done!"),1000)
//     });

//     promise.then((result) => {
//         console.log(result);
//     }); 
    
//     console.log("I am finished");
    
// }

// // fWithAwait();

// fWithThen();